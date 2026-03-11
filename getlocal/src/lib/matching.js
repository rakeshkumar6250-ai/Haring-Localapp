import { getJobs, getCandidates, getEmployers, getOutgoingLog } from './mongodb.js';

// ─── Education level hierarchy (higher index = higher qualification) ───
const EDUCATION_RANKS = {
  '10th Or Below': 1,
  '12th Pass': 2,
  'Diploma': 3,
  'ITI': 3,
  'Graduate': 4,
  'Post Graduate': 5,
};

// ─── English level hierarchy ───
const ENGLISH_RANKS = {
  'No English': 0,
  'Not Required': 0,
  'Basic English': 1,
  'Basic': 1,
  'Good English': 2,
  'Conversational': 2,
  'Fluent': 3,
};

// ─── Experience mapping ───
const EXP_RANKS = {
  'Fresher': 0,
  '0-1 Year': 1,
  '1-3 Years': 2,
  '3-5 Years': 3,
  '5+ Years': 4,
  'Experienced': 2,
};

/**
 * Calculate match score between a job and a candidate.
 * Compares education, english, experience, and category/title.
 * Returns { score: 0-100, matched: [...], missing: [...] }
 */
export function calculateMatchScore(job, candidate) {
  const matched = [];
  const missing = [];
  let totalWeight = 0;
  let earnedWeight = 0;

  // 1. Education (weight: 25)
  const weight_edu = 25;
  totalWeight += weight_edu;
  const jobEdu = EDUCATION_RANKS[job.minimum_education] || 0;
  const candEdu = EDUCATION_RANKS[candidate.education_level] || 0;
  if (jobEdu === 0 || candEdu >= jobEdu) {
    earnedWeight += weight_edu;
    matched.push('Education');
  } else {
    missing.push(`Education (needs ${job.minimum_education || 'any'}, has ${candidate.education_level || 'unknown'})`);
  }

  // 2. English (weight: 20)
  const weight_eng = 20;
  totalWeight += weight_eng;
  const jobEng = ENGLISH_RANKS[job.english_level] || 0;
  const candEng = ENGLISH_RANKS[candidate.english_level] || 0;
  if (jobEng === 0 || candEng >= jobEng) {
    earnedWeight += weight_eng;
    matched.push('English');
  } else {
    missing.push(`English (needs ${job.english_level || 'any'}, has ${candidate.english_level || 'unknown'})`);
  }

  // 3. Experience (weight: 30)
  const weight_exp = 30;
  totalWeight += weight_exp;
  const jobExp = EXP_RANKS[job.experience_required] || 0;
  const candExpType = EXP_RANKS[candidate.experience_type] || 0;
  const candExpYears = candidate.experience_years || 0;
  // Candidate matches if their level meets or exceeds, or they have enough years
  if (jobExp === 0 || candExpType >= jobExp || candExpYears >= jobExp) {
    earnedWeight += weight_exp;
    matched.push('Experience');
  } else {
    missing.push(`Experience (needs ${job.experience_required || 'any'}, has ${candidate.experience_type || 'Fresher'})`);
  }

  // 4. Category / Title match (weight: 25)
  const weight_cat = 25;
  totalWeight += weight_cat;
  const jobCat = (job.category || '').toLowerCase();
  const jobTitle = (job.title || '').toLowerCase();
  const candRole = (candidate.role_category || '').toLowerCase();
  const candSummary = (candidate.professional_summary || '').toLowerCase();

  const categoryMatch = jobCat && candRole && (
    jobCat === candRole ||
    jobTitle.includes(candRole) ||
    candRole.includes(jobCat) ||
    candSummary.includes(jobCat)
  );
  if (categoryMatch) {
    earnedWeight += weight_cat;
    matched.push('Role Category');
  } else {
    // Partial credit (10 of 25) if at least summary mentions something relevant
    const keywords = jobTitle.split(/\s+/).filter(w => w.length > 3);
    const partialMatch = keywords.some(k => candSummary.includes(k.toLowerCase()));
    if (partialMatch) {
      earnedWeight += 10;
      matched.push('Role (partial)');
    } else {
      missing.push(`Role (job: ${job.category}, candidate: ${candidate.role_category || 'General'})`);
    }
  }

  const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;

  return { score, matched, missing };
}

/**
 * Find all active jobs matching a candidate above a threshold.
 */
export async function findMatchingJobs(candidate, threshold = 50) {
  const jobs = await getJobs();
  const activeJobs = await jobs.find({ is_active: true }).toArray();

  const matches = [];
  for (const job of activeJobs) {
    const result = calculateMatchScore(job, candidate);
    if (result.score >= threshold) {
      matches.push({ job, ...result });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

/**
 * Find all candidates matching a job above a threshold.
 */
export async function findMatchingCandidates(job, threshold = 70) {
  const candidates = await getCandidates();
  const allCandidates = await candidates.find({}).toArray();

  const matches = [];
  for (const candidate of allCandidates) {
    const result = calculateMatchScore(job, candidate);
    if (result.score >= threshold) {
      matches.push({ candidate, ...result });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

const APP_BASE_URL = process.env.APP_URL || 'https://getlocal.app';

/**
 * Generate employer notification message for a candidate match.
 */
function formatEmployerNotification(candidateName, score, jobTitle, matched, missing, candidateId) {
  const matchedStr = matched.join(', ');
  const missingStr = missing.length > 0 ? missing.join(', ') : 'None';
  return `Match Alert! ${candidateName} is a ${score}% match for your ${jobTitle} role. Matches: ${matchedStr}. Missing: ${missingStr}. Click to view: ${APP_BASE_URL}/hire?highlight=${candidateId}`;
}

/**
 * Generate candidate notification message for a job match.
 */
function formatCandidateNotification(companyName, jobTitle, score, jobId) {
  return `New Job Found! ${companyName} is hiring for ${jobTitle}. You are a ${score}% match. Click here to confirm your interest and schedule an interview: ${APP_BASE_URL}/jobs?highlight=${jobId}`;
}

/**
 * Triggered when a new candidate joins or is updated.
 * Finds matching jobs (>50%) and logs employer notifications.
 */
export async function onCandidateCreatedOrUpdated(candidate) {
  try {
    const matches = await findMatchingJobs(candidate, 50);
    if (matches.length === 0) {
      console.log(`[MATCH] No jobs match candidate ${candidate.name || candidate._id} above 50%`);
      return [];
    }

    const outgoingLog = await getOutgoingLog();
    const employers = await getEmployers();
    const notifications = [];

    for (const { job, score, matched, missing } of matches) {
      // Find employer phone/contact for this job
      let employerPhone = 'N/A';
      if (job.employer_id) {
        const employer = await employers.findOne({ _id: job.employer_id });
        if (employer?.phone) employerPhone = employer.phone;
      }

      const message = formatEmployerNotification(
        candidate.name || 'A Candidate',
        score,
        job.title,
        matched,
        missing,
        candidate._id
      );

      const logEntry = {
        type: 'employer_match_alert',
        recipient_type: 'employer',
        recipient_id: job.employer_id || 'unknown',
        recipient_phone: employerPhone,
        candidate_id: candidate._id,
        candidate_name: candidate.name,
        job_id: job._id,
        job_title: job.title,
        match_score: score,
        matched_fields: matched,
        missing_fields: missing,
        message,
        status: 'queued',
        created_at: new Date(),
      };

      await outgoingLog.insertOne(logEntry);
      notifications.push(logEntry);
      console.log(`[MATCH] Employer alert: ${candidate.name} → ${job.title} (${score}%)`);
    }

    return notifications;
  } catch (err) {
    console.error('[MATCH] Error in onCandidateCreatedOrUpdated:', err.message);
    return [];
  }
}

/**
 * Triggered when a new job is posted.
 * Finds matching candidates (>70%) and logs candidate notifications.
 */
export async function onJobCreated(job) {
  try {
    const matches = await findMatchingCandidates(job, 70);
    if (matches.length === 0) {
      console.log(`[MATCH] No candidates match job ${job.title} above 70%`);
      return [];
    }

    const outgoingLog = await getOutgoingLog();
    const notifications = [];

    for (const { candidate, score, matched, missing } of matches) {
      const message = formatCandidateNotification(
        job.company_name || 'A Company',
        job.title,
        score,
        job._id
      );

      const logEntry = {
        type: 'candidate_job_alert',
        recipient_type: 'candidate',
        recipient_id: candidate._id,
        recipient_phone: candidate.phone || 'N/A',
        candidate_id: candidate._id,
        candidate_name: candidate.name,
        job_id: job._id,
        job_title: job.title,
        match_score: score,
        matched_fields: matched,
        missing_fields: missing,
        message,
        status: 'queued',
        created_at: new Date(),
      };

      await outgoingLog.insertOne(logEntry);
      notifications.push(logEntry);
      console.log(`[MATCH] Candidate alert: ${candidate.name} ← ${job.title} (${score}%)`);
    }

    return notifications;
  } catch (err) {
    console.error('[MATCH] Error in onJobCreated:', err.message);
    return [];
  }
}
