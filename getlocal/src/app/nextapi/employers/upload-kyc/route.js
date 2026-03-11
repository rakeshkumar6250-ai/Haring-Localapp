import { NextResponse } from 'next/server';
import { getEmployers } from '@/lib/mongodb';
import { writeFile, mkdir, access, constants } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const KYC_DIR = path.join(process.cwd(), 'public', 'kyc-docs');

async function ensureKycDir() {
  try {
    await access(KYC_DIR, constants.W_OK);
  } catch {
    await mkdir(KYC_DIR, { recursive: true, mode: 0o777 });
  }
}

export async function POST(request) {
  try {
    await ensureKycDir();

    const formData = await request.formData();
    const file = formData.get('document');
    const employerId = formData.get('employer_id');
    const companyName = formData.get('company_name');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No document file provided' }, { status: 400 });
    }
    if (!employerId) {
      return NextResponse.json({ error: 'employer_id is required' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Only PDF, JPG, PNG files are accepted' }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be under 5MB' }, { status: 400 });
    }

    // Save the file
    const ext = file.type === 'application/pdf' ? 'pdf' : file.type.includes('png') ? 'png' : 'jpg';
    const fileName = `${employerId}_kyc_${Date.now()}.${ext}`;
    const filePath = path.join(KYC_DIR, fileName);

    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    const documentUrl = `/kyc-docs/${fileName}`;

    // Update or create employer
    const employers = await getEmployers();
    const existing = await employers.findOne({ _id: employerId });

    if (existing) {
      await employers.updateOne(
        { _id: employerId },
        {
          $set: {
            verification_document_url: documentUrl,
            verification_status: 'Pending',
            company_name: companyName || existing.company_name,
            updated_at: new Date()
          }
        }
      );
    } else {
      await employers.insertOne({
        _id: employerId,
        company_name: companyName || 'Unknown Business',
        phone: '',
        verification_document_url: documentUrl,
        verification_status: 'Pending',
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    console.log(`[KYC] Document uploaded for employer ${employerId}: ${documentUrl}`);

    return NextResponse.json({
      success: true,
      employer_id: employerId,
      document_url: documentUrl,
      verification_status: 'Pending',
      message: 'KYC document uploaded. Verification pending.'
    }, { status: 201 });
  } catch (error) {
    console.error('KYC upload error:', error);
    return NextResponse.json({ error: 'Failed to upload KYC document', details: error.message }, { status: 500 });
  }
}
