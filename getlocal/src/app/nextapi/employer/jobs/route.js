import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import Application from '@/models/Application';
import { getJobs, getEmployers, getCandidates } from '@/lib/mongodb';
import { getAuthFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Returns the logged-in employer's job postings, each enriched with the list +
// count of applicants (worker details resolved from the candidates collection).
export async function GET(request) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const jobsCol = await getJobs();
    const employersCol = await getEmployers();
    const candidatesCol = await getCandidates();

    // Jobs owned by this employer (web jobs use employer_id, WhatsApp jobs use employer_phone).
    const orConds = [{ employer_id: auth.employer_id }];
    if (auth.phone) {
      orConds.push({ employer_phone: auth.phone }, { employer_phone: `whatsapp:${auth.phone}` });
    }
    const jobs = await jobsCol.find({ $or: orConds }).sort({ created_at: -1 }).toArray();

    await dbConnect();
    const jobIds = jobs.map((j) => String(j._id));
    const apps = jobIds.length
      ? await Application.find({ jobId: { $in: jobIds } }).sort({ createdAt: -1 }).lean()
      : [];

    // Resolve applicant -> account -> candidate profile (cached per userId).
    const cache = {};
    const resolveApplicant = async (userId) => {
      if (cache[userId]) return cache[userId];
      const acct = await employersCol.findOne({ _id: userId });
      const phone = acct?.phone || null;
      let candidate = null;
      if (phone) {
        candidate = await candidatesCol.findOne({ $or: [{ phone }, { phone: `whatsapp:${phone}` }] });
      }
      const address = candidate?.address;
      const info = {
        name: candidate?.name || acct?.company_name || 'Applicant',
        category: candidate?.role_category || null,
        location: (typeof address === 'string' ? address : address?.label) || null,
        phone,
      };
      cache[userId] = info;
      return info;
    };

    const appsByJob = {};
    for (const a of apps) {
      const info = await resolveApplicant(a.userId);
      (appsByJob[a.jobId] ||= []).push({
        applicationId: String(a._id),
        status: a.status || 'pending',
        appliedAt: a.createdAt || null,
        ...info,
      });
    }

    const result = jobs.map((j) => {
      const id = String(j._id);
      const applicants = appsByJob[id] || [];
      return {
        _id: id,
        title: j.title || j.category || 'Job',
        category: j.category || null,
        location:
          typeof j.location === 'string' ? j.location : j.location?.label || j.employer_location || null,
        salary: typeof j.salary === 'object' ? j.salary?.display : j.salary ? `₹${j.salary}` : null,
        job_type: j.job_type || null,
        status: j.status || 'active',
        created_at: j.created_at || null,
        applicant_count: applicants.length,
        applicants,
      };
    });

    return NextResponse.json({ jobs: result, total: result.length });
  } catch (error) {
    console.error('Employer jobs error:', error);
    return NextResponse.json({ error: 'Failed to fetch employer jobs' }, { status: 500 });
  }
}
