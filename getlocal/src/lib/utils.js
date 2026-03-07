// Calculate distance between two coordinates using Haversine formula
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

// Mask phone number for locked profiles
export function maskPhone(phone) {
  if (!phone || phone.length < 5) return '+91 ***** *****';
  // Format: +91 98*** *****
  const cleaned = phone.replace(/\s/g, '');
  if (cleaned.startsWith('+91')) {
    return `+91 ${cleaned.slice(3, 5)}*** *****`;
  }
  return `${phone.slice(0, 5)}** *****`;
}

// Calculate match score based on experience vs job requirement
export function calculateMatchScore(candidateExperience, requiredExperience = 3) {
  if (!candidateExperience || candidateExperience <= 0) return 50; // Base score
  
  const diff = Math.abs(candidateExperience - requiredExperience);
  
  // Perfect match or more experience = higher score
  if (candidateExperience >= requiredExperience) {
    // 85-98% for meeting or exceeding requirements
    return Math.min(98, 85 + (candidateExperience - requiredExperience) * 3);
  }
  
  // Less experience = lower score (but still viable)
  // Score drops ~10% per year under requirement
  return Math.max(40, 85 - diff * 15);
}

// Format distance for display
export function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)}m away`;
  return `${km.toFixed(1)}km away`;
}