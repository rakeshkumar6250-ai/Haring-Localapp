// Client-side match score calculator (mirrors matching.js logic but no DB deps)

const EDUCATION_RANKS = {
  '10th Or Below': 1,
  '12th Pass': 2,
  'Diploma': 3,
  'ITI': 3,
  'Graduate': 4,
  'Post Graduate': 5,
};

const ENGLISH_RANKS = {
  'No English': 0,
  'Not Required': 0,
  'Basic English': 1,
  'Basic': 1,
  'Good English': 2,
  'Conversational': 2,
  'Fluent': 3,
};

const EXP_RANKS = {
  'Fresher': 0,
  '0-1 Year': 1,
  '1-3 Years': 2,
  '3-5 Years': 3,
  '5+ Years': 4,
  'Experienced': 2,
};

/**
 * Calculate detailed match score between a job and a candidate.
 * Returns { score: 0-100, matched: [...], missing: [...] }
 */
export function calculateDetailedMatchScore(job, candidate) {
  if (!job || !candidate) return { score: 0, matched: [], missing: [] };

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
    const keywords = jobTitle.split(/\s+/).filter(w => w.length > 3);
    const partialMatch = keywords.some(k => candSummary.includes(k.toLowerCase()));
    if (partialMatch) {
      earnedWeight += 10;
      matched.push('Role (partial)');
    } else {
      missing.push(`Role (job: ${job.category || 'any'}, candidate: ${candidate.role_category || 'General'})`);
    }
  }

  const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
  return { score, matched, missing };
}
