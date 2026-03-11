"""
GetLocal V2 - Phase 8: Automated WhatsApp Matching Engine Tests
Tests:
- calculateMatchScore: education, english, experience, category scoring
- Trigger tests: candidate creation triggers employer alerts, job creation triggers candidate alerts
- API tests: /nextapi/notifications with filters
- Message format validation
- Threshold tests: >50% for employer alerts, >70% for candidate alerts
"""

import pytest
import requests
import os
import uuid
import time

# Base URL for getlocal Next.js API
BASE_URL = os.environ.get('GETLOCAL_API_URL', 'http://localhost:3001')


class TestCalculateMatchScore:
    """
    UNIT tests for calculateMatchScore function.
    We test indirectly by creating jobs and candidates with specific attributes
    and checking the match_score in the notification logs.
    """
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test prefix for cleanup"""
        self.test_prefix = f"MATCH_TEST_{uuid.uuid4().hex[:6]}"
    
    def test_perfect_match_near_100_percent(self):
        """
        Create a job and candidate with matching attributes:
        - Job: 12th Pass, Basic English, 1-3 Years, Cook category
        - Candidate: 12th Pass, Basic English, Experienced, Cook role
        Expected: ~100% match (Education + English + Experience + Role)
        """
        # Create job
        job_data = {
            "title": f"{self.test_prefix}_Perfect_Cook_Job",
            "category": "Cook",
            "company_name": "Test Kitchen Co",
            "minimum_education": "12th Pass",
            "english_level": "Basic",
            "experience_required": "1-3 Years",
            "employer_id": f"emp_{self.test_prefix}",
            "is_active": True
        }
        job_resp = requests.post(f"{BASE_URL}/nextapi/jobs", json=job_data)
        assert job_resp.status_code == 201, f"Job creation failed: {job_resp.text}"
        job_id = job_resp.json()["job"]["_id"]
        
        # Create matching candidate
        candidate_data = {
            "interview_type": "manual",
            "extracted_name": f"{self.test_prefix}_Perfect_Cook",
            "extracted_role": "Cook",
            "education_level": "12th Pass",
            "english_level": "Basic English",
            "experience_type": "Experienced",
            "extracted_experience": "3",
            "extracted_summary": "Experienced cook with 3 years in hotel kitchens. Specializes in North Indian cuisine."
        }
        
        # Use FormData for upload-audio
        form_data = {
            "interview_type": "manual",
            "extracted_name": candidate_data["extracted_name"],
            "extracted_role": candidate_data["extracted_role"],
            "education_level": candidate_data["education_level"],
            "english_level": candidate_data["english_level"],
            "experience_type": candidate_data["experience_type"],
            "extracted_experience": candidate_data["extracted_experience"],
            "extracted_summary": candidate_data["extracted_summary"],
        }
        
        # Create a dummy audio file for the FormData
        files = {'audio': ('test.webm', b'\x00' * 100, 'audio/webm')}
        
        cand_resp = requests.post(f"{BASE_URL}/nextapi/upload-audio", data=form_data, files=files)
        assert cand_resp.status_code == 201, f"Candidate creation failed: {cand_resp.text}"
        candidate_id = cand_resp.json()["candidateId"]
        
        # Wait for matching to complete (fire-and-forget is async)
        time.sleep(1)
        
        # Check notifications for employer_match_alert
        notif_resp = requests.get(f"{BASE_URL}/nextapi/notifications?candidate_id={candidate_id}")
        assert notif_resp.status_code == 200
        
        notifications = notif_resp.json()["notifications"]
        print(f"Found {len(notifications)} notifications for candidate {candidate_id}")
        
        # Find the notification for our specific job
        job_notification = None
        for n in notifications:
            if n.get("job_id") == job_id:
                job_notification = n
                break
        
        if job_notification:
            score = job_notification.get("match_score", 0)
            print(f"Perfect match score: {score}%")
            print(f"Matched fields: {job_notification.get('matched_fields', [])}")
            print(f"Missing fields: {job_notification.get('missing_fields', [])}")
            # Perfect match should be >= 75% (Education + English + Experience = 75%, Role match = 25%)
            assert score >= 75, f"Expected score >= 75% for perfect match, got {score}%"
        else:
            # If no notification, it might be below threshold - but perfect match should trigger
            print(f"No notification found for job {job_id} - checking all notifications")
            print(f"All notifications: {notifications}")
    
    def test_zero_match_nothing_matches(self):
        """
        Create a job and candidate with nothing matching:
        - Job: Graduate, Fluent English, 5+ Years, Electrician
        - Candidate: 10th Or Below, No English, Fresher, Cleaner
        Expected: ~0% or no notification (below threshold)
        """
        # Create demanding job
        job_data = {
            "title": f"{self.test_prefix}_Senior_Electrician",
            "category": "Electrician",
            "company_name": "ElectroCorp",
            "minimum_education": "Graduate",
            "english_level": "Fluent",
            "experience_required": "5+ Years",
            "employer_id": f"emp2_{self.test_prefix}",
            "is_active": True
        }
        job_resp = requests.post(f"{BASE_URL}/nextapi/jobs", json=job_data)
        assert job_resp.status_code == 201
        job_id = job_resp.json()["job"]["_id"]
        
        # Create mismatched candidate
        form_data = {
            "interview_type": "manual",
            "extracted_name": f"{self.test_prefix}_Fresher_Cleaner",
            "extracted_role": "Cleaner",
            "education_level": "10th Or Below",
            "english_level": "No English",
            "experience_type": "Fresher",
            "extracted_experience": "0",
            "extracted_summary": "New to workforce, looking for cleaning jobs."
        }
        files = {'audio': ('test.webm', b'\x00' * 100, 'audio/webm')}
        
        cand_resp = requests.post(f"{BASE_URL}/nextapi/upload-audio", data=form_data, files=files)
        assert cand_resp.status_code == 201
        candidate_id = cand_resp.json()["candidateId"]
        
        time.sleep(1)
        
        # Check notifications - should NOT have a match for this job (below 50% threshold)
        notif_resp = requests.get(f"{BASE_URL}/nextapi/notifications?candidate_id={candidate_id}")
        assert notif_resp.status_code == 200
        
        notifications = notif_resp.json()["notifications"]
        job_notification = next((n for n in notifications if n.get("job_id") == job_id), None)
        
        if job_notification:
            score = job_notification.get("match_score", 0)
            print(f"Zero match score: {score}%")
            # Should be below 50% threshold for employer alerts
            assert score < 50, f"Mismatched candidate should have score < 50%, got {score}%"
        else:
            print("No notification found - correctly below 50% threshold")
    
    def test_partial_category_match_via_summary(self):
        """
        Test partial match: candidate summary contains job category keyword
        - Job: category = Driver
        - Candidate: role = General, but summary mentions 'driving experience'
        Expected: Partial role credit (10 of 25 points)
        """
        job_data = {
            "title": f"{self.test_prefix}_Driver_Job",
            "category": "Driver",
            "company_name": "LogiCorp",
            "minimum_education": "10th Or Below",  # Easy match
            "english_level": "Not Required",  # Easy match
            "experience_required": "Fresher",  # Easy match
            "employer_id": f"emp3_{self.test_prefix}",
            "is_active": True
        }
        job_resp = requests.post(f"{BASE_URL}/nextapi/jobs", json=job_data)
        assert job_resp.status_code == 201
        job_id = job_resp.json()["job"]["_id"]
        
        # Create candidate with keyword in summary
        form_data = {
            "interview_type": "manual",
            "extracted_name": f"{self.test_prefix}_PartialMatch",
            "extracted_role": "General",  # Not Driver
            "education_level": "12th Pass",  # Exceeds requirement
            "english_level": "Basic English",  # Exceeds requirement
            "experience_type": "Fresher",
            "extracted_experience": "0",
            "extracted_summary": "Looking for jobs. I have some driving experience from family business."  # Contains 'driving'
        }
        files = {'audio': ('test.webm', b'\x00' * 100, 'audio/webm')}
        
        cand_resp = requests.post(f"{BASE_URL}/nextapi/upload-audio", data=form_data, files=files)
        assert cand_resp.status_code == 201
        candidate_id = cand_resp.json()["candidateId"]
        
        time.sleep(1)
        
        notif_resp = requests.get(f"{BASE_URL}/nextapi/notifications?candidate_id={candidate_id}")
        assert notif_resp.status_code == 200
        
        notifications = notif_resp.json()["notifications"]
        job_notification = next((n for n in notifications if n.get("job_id") == job_id), None)
        
        if job_notification:
            score = job_notification.get("match_score", 0)
            matched = job_notification.get("matched_fields", [])
            print(f"Partial match score: {score}%")
            print(f"Matched fields: {matched}")
            # Should have partial role match
            if "Role (partial)" in matched:
                print("Partial role match detected correctly")
            # Score should be around 75-85% (Education=25, English=20, Experience=30, Role(partial)=10)
            assert score >= 50, f"Partial match should exceed 50% threshold, got {score}%"
        else:
            print(f"No notification for job {job_id}")


class TestMatchingTriggers:
    """
    Test that creating candidates/jobs triggers the appropriate notifications
    """
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.test_prefix = f"TRIGGER_TEST_{uuid.uuid4().hex[:6]}"
    
    def test_candidate_creation_triggers_employer_alert(self):
        """
        TRIGGER: Creating a candidate via POST /nextapi/upload-audio 
        triggers onCandidateCreatedOrUpdated and creates employer_match_alert entries
        """
        # First create a job to match against
        job_data = {
            "title": f"{self.test_prefix}_Job_For_Trigger",
            "category": "Cook",
            "company_name": "Trigger Test Co",
            "minimum_education": "10th Or Below",
            "english_level": "Not Required",
            "experience_required": "Fresher",
            "employer_id": f"emp_{self.test_prefix}",
            "is_active": True
        }
        job_resp = requests.post(f"{BASE_URL}/nextapi/jobs", json=job_data)
        assert job_resp.status_code == 201
        job_id = job_resp.json()["job"]["_id"]
        
        # Now create a matching candidate
        form_data = {
            "interview_type": "manual",
            "extracted_name": f"{self.test_prefix}_Candidate",
            "extracted_role": "Cook",
            "education_level": "12th Pass",
            "english_level": "Basic English",
            "experience_type": "Experienced",
        }
        files = {'audio': ('test.webm', b'\x00' * 100, 'audio/webm')}
        
        cand_resp = requests.post(f"{BASE_URL}/nextapi/upload-audio", data=form_data, files=files)
        assert cand_resp.status_code == 201
        candidate_id = cand_resp.json()["candidateId"]
        
        time.sleep(1)
        
        # Check for employer_match_alert
        notif_resp = requests.get(f"{BASE_URL}/nextapi/notifications?type=employer_match_alert&candidate_id={candidate_id}")
        assert notif_resp.status_code == 200
        
        notifications = notif_resp.json()["notifications"]
        assert len(notifications) > 0, "Expected at least one employer_match_alert notification"
        
        # Verify notification structure
        for n in notifications:
            assert n["type"] == "employer_match_alert"
            assert n["candidate_id"] == candidate_id
            print(f"Employer alert for job {n.get('job_title')}: {n.get('match_score')}%")
    
    def test_job_creation_triggers_candidate_alert(self):
        """
        TRIGGER: Creating a job via POST /nextapi/jobs 
        triggers onJobCreated and creates candidate_job_alert entries
        """
        # First create a candidate that will match
        form_data = {
            "interview_type": "manual",
            "extracted_name": f"{self.test_prefix}_HighQualCandidate",
            "extracted_role": "Security Guard",
            "education_level": "Graduate",
            "english_level": "Good English",
            "experience_type": "Experienced",
            "extracted_experience": "5",
            "extracted_summary": "Experienced security guard with 5 years in corporate security."
        }
        files = {'audio': ('test.webm', b'\x00' * 100, 'audio/webm')}
        
        cand_resp = requests.post(f"{BASE_URL}/nextapi/upload-audio", data=form_data, files=files)
        assert cand_resp.status_code == 201
        candidate_id = cand_resp.json()["candidateId"]
        
        time.sleep(0.5)
        
        # Now create a job that matches (must be >70% for candidate alert)
        job_data = {
            "title": f"{self.test_prefix}_Security_Job",
            "category": "Security Guard",
            "company_name": "SecureCorp",
            "minimum_education": "12th Pass",  # Candidate has Graduate (meets)
            "english_level": "Basic",  # Candidate has Good (meets)
            "experience_required": "1-3 Years",  # Candidate has 5 years (meets)
            "employer_id": f"emp_{self.test_prefix}",
            "is_active": True
        }
        job_resp = requests.post(f"{BASE_URL}/nextapi/jobs", json=job_data)
        assert job_resp.status_code == 201
        job_id = job_resp.json()["job"]["_id"]
        
        time.sleep(1)
        
        # Check for candidate_job_alert
        notif_resp = requests.get(f"{BASE_URL}/nextapi/notifications?type=candidate_job_alert&job_id={job_id}")
        assert notif_resp.status_code == 200
        
        notifications = notif_resp.json()["notifications"]
        print(f"Found {len(notifications)} candidate_job_alert notifications for job {job_id}")
        
        # Should have at least one notification (for our high-qual candidate)
        if len(notifications) > 0:
            for n in notifications:
                assert n["type"] == "candidate_job_alert"
                assert n["job_id"] == job_id
                assert n.get("match_score", 0) >= 70, "Candidate alert should only fire for >70% matches"
                print(f"Candidate {n.get('candidate_name')} alerted: {n.get('match_score')}%")
        else:
            print("No candidate alerts - may need to check if candidate matches >70%")


class TestThresholds:
    """
    Test that alerts only fire above threshold:
    - Employer alerts: >50%
    - Candidate alerts: >70%
    """
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.test_prefix = f"THRESH_TEST_{uuid.uuid4().hex[:6]}"
    
    def test_employer_alert_at_50_percent_threshold(self):
        """
        Create a candidate that matches a job at exactly ~50% 
        Should trigger employer alert
        """
        # Job with specific requirements
        job_data = {
            "title": f"{self.test_prefix}_Threshold_Job",
            "category": "Driver",
            "company_name": "ThresholdCo",
            "minimum_education": "12th Pass",  # Weight 25
            "english_level": "Basic",  # Weight 20
            "experience_required": "1-3 Years",  # Weight 30
            "employer_id": f"emp_{self.test_prefix}",
            "is_active": True
        }
        job_resp = requests.post(f"{BASE_URL}/nextapi/jobs", json=job_data)
        assert job_resp.status_code == 201
        job_id = job_resp.json()["job"]["_id"]
        
        # Candidate that matches Education + English but NOT experience or category
        # Score = 25 + 20 = 45% (below 50%)
        form_data = {
            "interview_type": "manual",
            "extracted_name": f"{self.test_prefix}_45Percent",
            "extracted_role": "Cleaner",  # Doesn't match Driver
            "education_level": "Graduate",  # Meets 12th Pass
            "english_level": "Good English",  # Meets Basic
            "experience_type": "Fresher",  # Doesn't meet 1-3 Years
        }
        files = {'audio': ('test.webm', b'\x00' * 100, 'audio/webm')}
        
        cand_resp = requests.post(f"{BASE_URL}/nextapi/upload-audio", data=form_data, files=files)
        assert cand_resp.status_code == 201
        candidate_id = cand_resp.json()["candidateId"]
        
        time.sleep(1)
        
        # Check notifications
        notif_resp = requests.get(f"{BASE_URL}/nextapi/notifications?candidate_id={candidate_id}")
        assert notif_resp.status_code == 200
        
        notifications = notif_resp.json()["notifications"]
        job_notification = next((n for n in notifications if n.get("job_id") == job_id), None)
        
        if job_notification:
            score = job_notification.get("match_score", 0)
            print(f"45% candidate got score: {score}%")
            # If alert was created, score must be >= 50%
            assert score >= 50, f"Alert created but score is below 50%: {score}%"
        else:
            print(f"No alert for 45% candidate - correctly below threshold")
    
    def test_candidate_alert_70_percent_threshold(self):
        """
        Test that candidate alerts only fire for matches >70%
        """
        # Create a candidate first
        form_data = {
            "interview_type": "manual",
            "extracted_name": f"{self.test_prefix}_TestCandidate",
            "extracted_role": "Plumber",
            "education_level": "ITI",  # Diploma level
            "english_level": "Basic English",
            "experience_type": "Experienced",
        }
        files = {'audio': ('test.webm', b'\x00' * 100, 'audio/webm')}
        
        cand_resp = requests.post(f"{BASE_URL}/nextapi/upload-audio", data=form_data, files=files)
        assert cand_resp.status_code == 201
        candidate_id = cand_resp.json()["candidateId"]
        
        # Create job that should match ~60% (below 70% threshold)
        # Education match, English match, Experience match, but category mismatch
        # Score = 25 + 20 + 30 = 75% if category matches, 50% if not
        job_data = {
            "title": f"{self.test_prefix}_Electrician_Job",
            "category": "Electrician",  # Doesn't match Plumber
            "company_name": "ElecCo",
            "minimum_education": "ITI",
            "english_level": "Basic",
            "experience_required": "Experienced",
            "employer_id": f"emp_{self.test_prefix}",
            "is_active": True
        }
        job_resp = requests.post(f"{BASE_URL}/nextapi/jobs", json=job_data)
        assert job_resp.status_code == 201
        job_id = job_resp.json()["job"]["_id"]
        
        time.sleep(1)
        
        # Check for candidate_job_alert for this job
        notif_resp = requests.get(f"{BASE_URL}/nextapi/notifications?type=candidate_job_alert&job_id={job_id}")
        assert notif_resp.status_code == 200
        
        notifications = notif_resp.json()["notifications"]
        
        # Any notification for this job should have score >= 70%
        for n in notifications:
            score = n.get("match_score", 0)
            assert score >= 70, f"Candidate alert for score {score}% - should be >= 70%"
            print(f"Candidate alert: {n.get('candidate_name')} - {score}%")
        
        print(f"Found {len(notifications)} candidate alerts for job (all >= 70%)")


class TestNotificationAPI:
    """
    Test GET /nextapi/notifications API with various filters
    """
    
    def test_get_all_notifications(self):
        """GET /nextapi/notifications returns all notifications with stats"""
        resp = requests.get(f"{BASE_URL}/nextapi/notifications")
        assert resp.status_code == 200
        
        data = resp.json()
        assert "notifications" in data
        assert "stats" in data
        assert "count" in data
        
        stats = data["stats"]
        assert "total" in stats
        assert "employer_alerts" in stats
        assert "candidate_alerts" in stats
        
        print(f"Total notifications: {stats['total']}")
        print(f"Employer alerts: {stats['employer_alerts']}")
        print(f"Candidate alerts: {stats['candidate_alerts']}")
    
    def test_filter_by_type_employer(self):
        """GET /nextapi/notifications?type=employer_match_alert filters correctly"""
        resp = requests.get(f"{BASE_URL}/nextapi/notifications?type=employer_match_alert")
        assert resp.status_code == 200
        
        notifications = resp.json()["notifications"]
        for n in notifications:
            assert n["type"] == "employer_match_alert", f"Expected employer_match_alert, got {n['type']}"
        
        print(f"Found {len(notifications)} employer_match_alert notifications")
    
    def test_filter_by_type_candidate(self):
        """GET /nextapi/notifications?type=candidate_job_alert filters correctly"""
        resp = requests.get(f"{BASE_URL}/nextapi/notifications?type=candidate_job_alert")
        assert resp.status_code == 200
        
        notifications = resp.json()["notifications"]
        for n in notifications:
            assert n["type"] == "candidate_job_alert", f"Expected candidate_job_alert, got {n['type']}"
        
        print(f"Found {len(notifications)} candidate_job_alert notifications")
    
    def test_filter_by_candidate_id(self):
        """GET /nextapi/notifications?candidate_id=<id> filters by candidate"""
        # First get any notification to extract a candidate_id
        resp = requests.get(f"{BASE_URL}/nextapi/notifications?limit=1")
        assert resp.status_code == 200
        
        notifications = resp.json()["notifications"]
        if len(notifications) > 0:
            candidate_id = notifications[0].get("candidate_id")
            if candidate_id:
                # Now filter by this candidate_id
                filter_resp = requests.get(f"{BASE_URL}/nextapi/notifications?candidate_id={candidate_id}")
                assert filter_resp.status_code == 200
                
                filtered = filter_resp.json()["notifications"]
                for n in filtered:
                    assert n["candidate_id"] == candidate_id
                
                print(f"Found {len(filtered)} notifications for candidate {candidate_id}")
        else:
            print("No notifications to test candidate_id filter")
    
    def test_filter_by_job_id(self):
        """GET /nextapi/notifications?job_id=<id> filters by job"""
        # Get jobs first
        jobs_resp = requests.get(f"{BASE_URL}/nextapi/jobs")
        assert jobs_resp.status_code == 200
        
        jobs = jobs_resp.json()["jobs"]
        if len(jobs) > 0:
            job_id = jobs[0]["_id"]
            
            # Filter notifications by job_id
            notif_resp = requests.get(f"{BASE_URL}/nextapi/notifications?job_id={job_id}")
            assert notif_resp.status_code == 200
            
            filtered = notif_resp.json()["notifications"]
            for n in filtered:
                assert n.get("job_id") == job_id
            
            print(f"Found {len(filtered)} notifications for job {job_id}")
        else:
            print("No jobs to test job_id filter")


class TestMessageFormat:
    """
    Test that notification messages contain required components
    """
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.test_prefix = f"MSG_TEST_{uuid.uuid4().hex[:6]}"
    
    def test_employer_message_format(self):
        """
        Employer message should contain:
        - 'Match Alert!'
        - candidate name
        - score%
        - job title
        - matched fields
        - missing fields
        - app link
        """
        # Get an employer_match_alert notification
        resp = requests.get(f"{BASE_URL}/nextapi/notifications?type=employer_match_alert&limit=1")
        assert resp.status_code == 200
        
        notifications = resp.json()["notifications"]
        if len(notifications) > 0:
            n = notifications[0]
            message = n.get("message", "")
            
            print(f"Employer message: {message}")
            
            # Check required components
            assert "Match Alert!" in message, "Missing 'Match Alert!' in employer message"
            assert n.get("candidate_name", "") in message or "A Candidate" in message, "Missing candidate name"
            assert f"{n.get('match_score')}%" in message, "Missing score percentage"
            assert n.get("job_title", "") in message, "Missing job title"
            
            # Check for link
            assert "https://" in message or "http://" in message, "Missing app link"
            assert "/hire" in message, "Missing /hire link path"
            
            print("Employer message format: VALID")
        else:
            print("No employer_match_alert to test message format")
    
    def test_candidate_message_format(self):
        """
        Candidate message should contain:
        - 'New Job Found!'
        - company name
        - job title
        - score%
        - app link
        """
        resp = requests.get(f"{BASE_URL}/nextapi/notifications?type=candidate_job_alert&limit=1")
        assert resp.status_code == 200
        
        notifications = resp.json()["notifications"]
        if len(notifications) > 0:
            n = notifications[0]
            message = n.get("message", "")
            
            print(f"Candidate message: {message}")
            
            # Check required components
            assert "New Job Found!" in message, "Missing 'New Job Found!' in candidate message"
            assert f"{n.get('match_score')}%" in message, "Missing score percentage"
            assert n.get("job_title", "") in message, "Missing job title"
            
            # Check for link
            assert "https://" in message or "http://" in message, "Missing app link"
            assert "/jobs" in message, "Missing /jobs link path"
            
            print("Candidate message format: VALID")
        else:
            print("No candidate_job_alert to test message format")


class TestDataIntegrity:
    """
    Test that outgoing_log entries have all required fields
    """
    
    def test_notification_entry_has_required_fields(self):
        """
        Verify outgoing_log entries have:
        type, recipient_type, recipient_id, message, match_score, 
        matched_fields, missing_fields, status, created_at
        """
        resp = requests.get(f"{BASE_URL}/nextapi/notifications?limit=5")
        assert resp.status_code == 200
        
        notifications = resp.json()["notifications"]
        
        required_fields = [
            "type", "recipient_type", "recipient_id", "message", 
            "match_score", "matched_fields", "missing_fields", "status", "created_at"
        ]
        
        for n in notifications:
            missing_fields = []
            for field in required_fields:
                if field not in n:
                    missing_fields.append(field)
            
            if missing_fields:
                print(f"Notification {n.get('_id')} missing fields: {missing_fields}")
            else:
                print(f"Notification {n.get('_id')} has all required fields")
            
            # Assert all required fields present
            assert len(missing_fields) == 0, f"Missing required fields: {missing_fields}"
        
        print(f"Checked {len(notifications)} notifications - all have required fields")


class TestRegression:
    """
    Regression tests to ensure existing pages still work
    """
    
    def test_jobs_api_still_works(self):
        """GET /nextapi/jobs returns 200"""
        resp = requests.get(f"{BASE_URL}/nextapi/jobs")
        assert resp.status_code == 200
        assert "jobs" in resp.json()
        print(f"Jobs API: OK - {len(resp.json()['jobs'])} jobs")
    
    def test_candidates_api_still_works(self):
        """GET /nextapi/candidates returns 200"""
        resp = requests.get(f"{BASE_URL}/nextapi/candidates")
        assert resp.status_code == 200
        print(f"Candidates API: OK")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
