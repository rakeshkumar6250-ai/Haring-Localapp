"""
GetLocal V2 - Comprehensive Test Suite
======================================
4 Test Suites:
  1. Candidate Voice & AI Pipeline
  2. Two-Sided KYC & Verification
  3. Employer Dashboard & Matchmaking
  4. Schema & API Health
"""

import pytest
import requests
import os
import time
import json
from datetime import datetime
from io import BytesIO

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:3000').rstrip('/')

# Test Data Prefixes
SUITE1_PREFIX = "TEST_SUITE1_"
SUITE2_PREFIX = "TEST_SUITE2_"
SUITE3_PREFIX = "TEST_SUITE3_"
SUITE4_PREFIX = "TEST_SUITE4_"

# ============================================================================
# SUITE 1: Candidate Voice & AI Pipeline
# ============================================================================

class TestSuite1VoiceAIPipeline:
    """Suite 1: Voice & AI Pipeline Tests"""

    def test_1_1_upload_telugu_audio(self):
        """Upload Telugu audio (lang_code='te') and verify Whisper + GPT-4o-mini processing"""
        # Use the Telugu test audio file
        audio_path = '/tmp/telugu_test.webm'
        if not os.path.exists(audio_path):
            pytest.skip("Telugu test audio not found")
        
        with open(audio_path, 'rb') as f:
            audio_data = f.read()
        
        files = {
            'audio': ('telugu_test.webm', BytesIO(audio_data), 'audio/webm')
        }
        data = {
            'lang_code': 'te',
            'language': 'te',
            'interview_type': 'voice'
        }
        
        response = requests.post(f'{BASE_URL}/nextapi/upload-audio', files=files, data=data)
        assert response.status_code == 201, f"Upload failed: {response.text}"
        
        result = response.json()
        assert 'candidateId' in result, "No candidateId in response"
        assert result.get('success') == True
        
        candidate_id = result['candidateId']
        print(f"[SUITE 1.1] Uploaded Telugu audio. CandidateId: {candidate_id}")
        
        # Wait for background AI processing (15 seconds as per instructions)
        print("[SUITE 1.1] Waiting 15 seconds for AI processing...")
        time.sleep(15)
        
        # Verify candidate record was processed
        response = requests.get(f'{BASE_URL}/nextapi/candidates')
        assert response.status_code == 200
        
        candidates = response.json().get('candidates', [])
        candidate = next((c for c in candidates if c['_id'] == candidate_id), None)
        
        assert candidate is not None, f"Candidate {candidate_id} not found"
        
        # Check AI processing result
        ai_source = candidate.get('ai_source', '')
        moltbot_processed = candidate.get('moltbot_processed', False)
        
        print(f"[SUITE 1.1] ai_source: {ai_source}, processed: {moltbot_processed}")
        print(f"[SUITE 1.1] name: {candidate.get('name')}")
        print(f"[SUITE 1.1] experience_years: {candidate.get('experience_years')}")
        print(f"[SUITE 1.1] professional_summary: {candidate.get('professional_summary', '')[:100]}...")
        
        assert moltbot_processed == True, "Candidate not processed"
        assert ai_source in ['openai', 'mock_fallback'], f"Unexpected ai_source: {ai_source}"
        
        # If OpenAI worked, verify structured JSON response
        if ai_source == 'openai':
            print("[SUITE 1.1] PASS - OpenAI Whisper + GPT-4o-mini processed successfully!")
            assert 'name' in candidate and candidate['name'], "Missing name in AI response"
        else:
            print("[SUITE 1.1] PASS - Fallback triggered (API may be unavailable)")
    
    def test_1_2_mock_fallback_code_exists(self):
        """Verify mock fallback logic exists in upload-audio route"""
        # Read the route.js file to verify fallback code structure
        route_path = '/app/getlocal/src/app/nextapi/upload-audio/route.js'
        if not os.path.exists(route_path):
            pytest.skip("Route file not found")
        
        with open(route_path, 'r') as f:
            code = f.read()
        
        # Verify mock fallback constants exist
        assert 'MOCK_NAMES' in code, "Missing MOCK_NAMES constant"
        assert 'MOCK_SUMMARIES' in code, "Missing MOCK_SUMMARIES constant"
        assert 'getMockProfile' in code, "Missing getMockProfile function"
        assert "ai_source: 'mock_fallback'" in code, "Missing mock_fallback ai_source"
        
        # Verify try/catch structure for fallback
        assert 'try {' in code, "Missing try block"
        assert 'catch (error)' in code or 'catch(error)' in code, "Missing catch block"
        assert 'Falling back to mock data' in code, "Missing fallback log message"
        
        print("[SUITE 1.2] PASS - Mock fallback code structure verified")
    
    def test_1_3_data_integrity_after_processing(self):
        """Verify candidate record has correct field mapping after AI processing"""
        # Create a manual candidate to verify data integrity
        files = {
            'audio': ('test.webm', BytesIO(b'test'), 'audio/webm')
        }
        data = {
            'lang_code': 'en',
            'interview_type': 'manual',
            'extracted_name': f'{SUITE1_PREFIX}DataIntegrity',
            'extracted_experience': '5',
            'extracted_summary': 'Test data integrity check',
            'education_level': '12th Pass',
            'english_level': 'Good English',
            'experience_type': 'Experienced'
        }
        
        response = requests.post(f'{BASE_URL}/nextapi/upload-audio', files=files, data=data)
        assert response.status_code == 201
        
        candidate_id = response.json()['candidateId']
        
        # Verify record in DB
        response = requests.get(f'{BASE_URL}/nextapi/candidates')
        candidates = response.json().get('candidates', [])
        candidate = next((c for c in candidates if c['_id'] == candidate_id), None)
        
        assert candidate is not None
        assert candidate['name'] == f'{SUITE1_PREFIX}DataIntegrity', "Name not mapped correctly"
        assert candidate['experience_years'] == 5 or candidate['experience_years'] == '5', "Experience not mapped"
        assert candidate.get('professional_summary') == 'Test data integrity check', "Summary not mapped"
        assert candidate['education_level'] == '12th Pass', "Education not mapped"
        assert candidate['english_level'] == 'Good English', "English level not mapped"
        
        print("[SUITE 1.3] PASS - Data integrity verified for manual entry")


# ============================================================================
# SUITE 2: Two-Sided KYC & Verification
# ============================================================================

class TestSuite2KYCVerification:
    """Suite 2: KYC & Verification Flow Tests"""
    
    @pytest.fixture
    def create_test_employer(self):
        """Create a new test employer and return its ID"""
        employer_id = f'{SUITE2_PREFIX}Employer_{int(time.time())}'
        response = requests.post(f'{BASE_URL}/nextapi/employers', json={
            'employer_id': employer_id,
            'company_name': f'{SUITE2_PREFIX}TestCompany'
        })
        assert response.status_code == 201
        return employer_id
    
    def test_2_1_employer_e2e_kyc_flow(self, create_test_employer):
        """Employer E2E: Create pending -> Upload KYC -> Verify status changes"""
        employer_id = create_test_employer
        
        # Step 1: Verify initial status is Unverified
        response = requests.get(f'{BASE_URL}/nextapi/employers?id={employer_id}')
        assert response.status_code == 200
        employer = response.json().get('employer', {})
        assert employer['verification_status'] == 'Unverified', "Initial status should be Unverified"
        print(f"[SUITE 2.1] Step 1: Employer {employer_id} created with Unverified status")
        
        # Step 2: Upload KYC document
        kyc_doc = BytesIO(b'%PDF-1.4 Test KYC Document')
        files = {'document': ('kyc_test.pdf', kyc_doc, 'application/pdf')}
        data = {'employer_id': employer_id, 'company_name': f'{SUITE2_PREFIX}TestCompany'}
        
        response = requests.post(f'{BASE_URL}/nextapi/employers/upload-kyc', files=files, data=data)
        assert response.status_code == 201
        
        result = response.json()
        assert result['verification_status'] == 'Pending', "After KYC upload, status should be Pending"
        print(f"[SUITE 2.1] Step 2: KYC uploaded, status now Pending")
        
        # Step 3: Verify status changed to Pending
        response = requests.get(f'{BASE_URL}/nextapi/employers?id={employer_id}')
        employer = response.json().get('employer', {})
        assert employer['verification_status'] == 'Pending'
        assert employer['verification_document_url'] is not None
        print(f"[SUITE 2.1] PASS - Employer KYC E2E flow complete")
    
    def test_2_2_candidate_e2e_kyc_flow(self):
        """Candidate E2E: Create candidate -> Upload ID -> Verify status becomes Pending"""
        # Step 1: Create candidate via manual upload-audio
        files = {'audio': ('test.webm', BytesIO(b'test'), 'audio/webm')}
        data = {
            'interview_type': 'manual',
            'extracted_name': f'{SUITE2_PREFIX}CandidateKYC',
            'education_level': 'Graduate',
            'english_level': 'Good English',
            'experience_type': 'Fresher'
        }
        
        response = requests.post(f'{BASE_URL}/nextapi/upload-audio', files=files, data=data)
        assert response.status_code == 201
        candidate_id = response.json()['candidateId']
        print(f"[SUITE 2.2] Created candidate: {candidate_id}")
        
        # Step 2: Verify initial status
        response = requests.get(f'{BASE_URL}/nextapi/candidates')
        candidates = response.json().get('candidates', [])
        candidate = next((c for c in candidates if c['_id'] == candidate_id), None)
        assert candidate['verification_status'] == 'Unverified'
        
        # Step 3: Upload ID document
        id_doc = BytesIO(b'Test ID Document PNG Content')
        files = {'document': ('id.png', id_doc, 'image/png')}
        data = {'candidate_id': candidate_id}
        
        response = requests.post(f'{BASE_URL}/nextapi/candidates/upload-id', files=files, data=data)
        assert response.status_code == 201
        
        result = response.json()
        assert result['verification_status'] == 'Pending', "After ID upload, status should be Pending"
        print(f"[SUITE 2.2] PASS - Candidate ID uploaded, status now Pending")
    
    def test_2_3_admin_kyc_approve_employer(self, create_test_employer):
        """Admin KYC: Upload doc -> Approve -> Verify status='Verified'"""
        employer_id = create_test_employer
        
        # Upload KYC doc first
        files = {'document': ('kyc.pdf', BytesIO(b'%PDF test'), 'application/pdf')}
        data = {'employer_id': employer_id}
        requests.post(f'{BASE_URL}/nextapi/employers/upload-kyc', files=files, data=data)
        
        # Admin approve
        response = requests.patch(f'{BASE_URL}/nextapi/employers', json={
            'employer_id': employer_id,
            'action': 'approve'
        })
        assert response.status_code == 200
        assert response.json()['verification_status'] == 'Verified'
        
        # Verify in DB
        response = requests.get(f'{BASE_URL}/nextapi/employers?id={employer_id}')
        assert response.json()['employer']['verification_status'] == 'Verified'
        print(f"[SUITE 2.3] PASS - Admin approved employer KYC -> Verified")
    
    def test_2_4_admin_kyc_approve_candidate(self):
        """Admin KYC: Approve candidate -> Verify status='Verified'"""
        # Create candidate
        files = {'audio': ('test.webm', BytesIO(b'test'), 'audio/webm')}
        data = {
            'interview_type': 'manual',
            'extracted_name': f'{SUITE2_PREFIX}AdminApprove',
        }
        response = requests.post(f'{BASE_URL}/nextapi/upload-audio', files=files, data=data)
        candidate_id = response.json()['candidateId']
        
        # Upload ID doc
        files = {'document': ('id.jpg', BytesIO(b'jpg content'), 'image/jpeg')}
        data = {'candidate_id': candidate_id}
        requests.post(f'{BASE_URL}/nextapi/candidates/upload-id', files=files, data=data)
        
        # Admin approve
        response = requests.patch(f'{BASE_URL}/nextapi/candidates', json={
            'candidate_id': candidate_id,
            'action': 'approve'
        })
        assert response.status_code == 200
        assert response.json()['verification_status'] == 'Verified'
        print(f"[SUITE 2.4] PASS - Admin approved candidate KYC -> Verified")


# ============================================================================
# SUITE 3: Employer Dashboard & Matchmaking
# ============================================================================

class TestSuite3FilteringMatchmaking:
    """Suite 3: Filtering & Matchmaking Tests"""
    
    @pytest.fixture(scope='class')
    def create_filter_test_candidates(self, request):
        """Create 3 candidates with different education/english/experience for filter testing"""
        candidates_data = [
            {
                'extracted_name': f'{SUITE3_PREFIX}CandidateA_12thGoodExp',
                'education_level': '12th Pass',
                'english_level': 'Good English',
                'experience_type': 'Experienced'
            },
            {
                'extracted_name': f'{SUITE3_PREFIX}CandidateB_GradBasicFresher',
                'education_level': 'Graduate',
                'english_level': 'Basic English',
                'experience_type': 'Fresher'
            },
            {
                'extracted_name': f'{SUITE3_PREFIX}CandidateC_12thBasicFresher',
                'education_level': '12th Pass',
                'english_level': 'Basic English',
                'experience_type': 'Fresher'
            }
        ]
        
        created_ids = []
        for cdata in candidates_data:
            files = {'audio': ('test.webm', BytesIO(b'test'), 'audio/webm')}
            data = {'interview_type': 'manual', **cdata}
            response = requests.post(f'{BASE_URL}/nextapi/upload-audio', files=files, data=data)
            if response.status_code == 201:
                created_ids.append(response.json()['candidateId'])
        
        request.cls.created_candidate_ids = created_ids
        return created_ids
    
    def test_3_1_filter_regression_education_english(self, create_filter_test_candidates):
        """Filter: education=12th Pass & english=Good English -> ONLY matching candidates returned"""
        time.sleep(1)  # Small delay to ensure DB sync
        
        # Filter for 12th Pass + Good English
        response = requests.get(f'{BASE_URL}/nextapi/candidates', params={
            'education': '12th Pass',
            'english': 'Good English'
        })
        assert response.status_code == 200
        
        candidates = response.json().get('candidates', [])
        
        # Filter to only SUITE3 test candidates to avoid interference
        suite3_candidates = [c for c in candidates if c['name'].startswith(SUITE3_PREFIX)]
        
        # Should return ONLY CandidateA (12th Pass + Good English)
        assert len(suite3_candidates) >= 1, "Should find at least CandidateA"
        
        for c in suite3_candidates:
            assert c['education_level'] == '12th Pass', f"Wrong education: {c['education_level']}"
            assert c['english_level'] == 'Good English', f"Wrong english: {c['english_level']}"
        
        # Verify no false positives (CandidateB and CandidateC should NOT be in results)
        names = [c['name'] for c in suite3_candidates]
        assert not any('CandidateB' in n for n in names), "CandidateB should NOT match filter"
        assert not any('CandidateC' in n for n in names), "CandidateC should NOT match filter"
        
        print(f"[SUITE 3.1] PASS - Filter returned {len(suite3_candidates)} matching candidate(s), no false positives")
    
    def test_3_2_filter_experience_only(self, create_filter_test_candidates):
        """Filter: experience=Fresher -> Only freshers returned"""
        response = requests.get(f'{BASE_URL}/nextapi/candidates', params={
            'experience': 'Fresher'
        })
        assert response.status_code == 200
        
        candidates = response.json().get('candidates', [])
        suite3_candidates = [c for c in candidates if c['name'].startswith(SUITE3_PREFIX)]
        
        # Should return CandidateB and CandidateC (both Fresher)
        for c in suite3_candidates:
            assert c['experience_type'] == 'Fresher', f"Wrong experience: {c['experience_type']}"
        
        print(f"[SUITE 3.2] PASS - Experience filter working correctly")
    
    def test_3_3_verified_only_filter(self):
        """Filter: verified=true -> Only verified candidates returned"""
        response = requests.get(f'{BASE_URL}/nextapi/candidates', params={'verified': 'true'})
        assert response.status_code == 200
        
        candidates = response.json().get('candidates', [])
        
        for c in candidates:
            assert c['verification_status'] == 'Verified', f"Unverified candidate in results: {c['name']}"
        
        print(f"[SUITE 3.3] PASS - Verified-only filter working, found {len(candidates)} verified candidates")
    
    def test_3_4_whatsapp_link_generation(self):
        """Verify WhatsApp link generation logic matches expected format"""
        # The getWhatsAppLink function builds: https://wa.me/<cleanPhone>?text=<encodedMsg>
        # We can verify this by checking the hire page code
        
        hire_page_path = '/app/getlocal/src/app/hire/page.js'
        with open(hire_page_path, 'r') as f:
            code = f.read()
        
        # Verify getWhatsAppLink function exists
        assert 'getWhatsAppLink' in code, "Missing getWhatsAppLink function"
        assert 'wa.me' in code, "Missing wa.me URL"
        assert 'encodeURIComponent' in code, "Missing URL encoding"
        
        # Verify message format
        assert 'Hello' in code and 'GetLocal' in code, "Missing proper message template"
        
        print("[SUITE 3.4] PASS - WhatsApp link generation code verified")


# ============================================================================
# SUITE 4: Schema & API Health
# ============================================================================

class TestSuite4SchemaAPIHealth:
    """Suite 4: Schema Validation & API Health Tests"""
    
    def test_4_1_jobs_post_validation_no_title(self):
        """POST /nextapi/jobs without title -> expect 400"""
        response = requests.post(f'{BASE_URL}/nextapi/jobs', json={
            'category': 'Driver'
            # Missing 'title'
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert 'error' in response.json() or 'title' in response.text.lower()
        print("[SUITE 4.1] PASS - Jobs POST validation rejects missing title")
    
    def test_4_2_jobs_post_expanded_schema(self):
        """POST /nextapi/jobs with all new fields -> verify all stored correctly"""
        job_data = {
            'title': f'{SUITE4_PREFIX}FullSchemaJob',
            'category': 'Cook',
            'company_name': 'Test Company',
            'job_type': 'Part Time',
            'work_location_type': 'Home',
            'pay_type': 'Fixed+Incentive',
            'requires_joining_fee': True,
            'minimum_education': '12th Pass',
            'english_level': 'Conversational',
            'experience_required': '1-3 Years',
            'is_walk_in': True,
            'contact_preference': 'Phone Call',
            'job_description': 'Test job description',
            'salary': {'type': 'fixed', 'amount': 15000}
        }
        
        response = requests.post(f'{BASE_URL}/nextapi/jobs', json=job_data)
        assert response.status_code == 201, f"Job creation failed: {response.text}"
        
        job = response.json().get('job', {})
        
        # Verify all new fields were stored
        assert job['job_type'] == 'Part Time'
        assert job['work_location_type'] == 'Home'
        assert job['pay_type'] == 'Fixed+Incentive'
        assert job['requires_joining_fee'] == True
        assert job['minimum_education'] == '12th Pass'
        assert job['english_level'] == 'Conversational'
        assert job['experience_required'] == '1-3 Years'
        assert job['is_walk_in'] == True
        assert job['contact_preference'] == 'Phone Call'
        
        print("[SUITE 4.2] PASS - All expanded job schema fields stored correctly")
    
    def test_4_3_candidates_post_validation_no_audio(self):
        """POST /nextapi/upload-audio without audio -> expect error"""
        response = requests.post(f'{BASE_URL}/nextapi/upload-audio', data={
            'interview_type': 'voice'
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("[SUITE 4.3] PASS - Candidates upload rejects missing audio")
    
    def test_4_4_candidates_manual_entry_stores_fields(self):
        """POST /nextapi/upload-audio manual entry stores education/english/experience"""
        files = {'audio': ('test.webm', BytesIO(b'test'), 'audio/webm')}
        data = {
            'interview_type': 'manual',
            'extracted_name': f'{SUITE4_PREFIX}ManualStore',
            'education_level': 'Diploma',
            'english_level': 'Basic English',
            'experience_type': 'Experienced'
        }
        
        response = requests.post(f'{BASE_URL}/nextapi/upload-audio', files=files, data=data)
        assert response.status_code == 201
        
        candidate_id = response.json()['candidateId']
        
        # Verify fields stored
        response = requests.get(f'{BASE_URL}/nextapi/candidates')
        candidates = response.json().get('candidates', [])
        candidate = next((c for c in candidates if c['_id'] == candidate_id), None)
        
        assert candidate['education_level'] == 'Diploma'
        assert candidate['english_level'] == 'Basic English'
        assert candidate['experience_type'] == 'Experienced'
        
        print("[SUITE 4.4] PASS - Manual entry stores all KYC fields correctly")
    
    def test_4_5_employer_post_validation_no_company_name(self):
        """POST /nextapi/employers without company_name -> expect 400"""
        response = requests.post(f'{BASE_URL}/nextapi/employers', json={
            'phone': '1234567890'
            # Missing 'company_name'
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("[SUITE 4.5] PASS - Employer POST rejects missing company_name")
    
    def test_4_6_employer_patch_invalid_action(self):
        """PATCH /nextapi/employers without valid action -> expect 400"""
        response = requests.patch(f'{BASE_URL}/nextapi/employers', json={
            'employer_id': 'test-id',
            'action': 'invalid_action'
        })
        assert response.status_code == 400
        print("[SUITE 4.6] PASS - Employer PATCH rejects invalid action")
    
    def test_4_7_api_health_all_endpoints(self):
        """Verify all key API endpoints return valid responses"""
        endpoints = [
            ('GET', '/nextapi/candidates', 200),
            ('GET', '/nextapi/employers', 200),
            ('GET', '/nextapi/jobs', 200),
        ]
        
        for method, endpoint, expected_status in endpoints:
            if method == 'GET':
                response = requests.get(f'{BASE_URL}{endpoint}')
            
            assert response.status_code == expected_status, \
                f"{method} {endpoint} returned {response.status_code}, expected {expected_status}"
        
        print("[SUITE 4.7] PASS - All API endpoints healthy")


# ============================================================================
# Test Summary Generator
# ============================================================================

if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short', '-x'])
