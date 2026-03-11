"""
Test Suite for GetLocal V2 - Candidate KYC and Filtering
Tests the new candidate KYC fields (education_level, english_level, experience_type)
and the filter functionality on /nextapi/candidates endpoint.
"""
import pytest
import requests
import os
import json
from io import BytesIO

BASE_URL = "http://localhost:3000"

# Test Candidate ID that has all KYC fields populated
VERIFIED_CANDIDATE_ID = "ad1c43f5-991e-407f-ac94-a7141c5bd672"


class TestCandidateFilters:
    """Test candidate filtering by KYC fields"""

    def test_filter_by_education_level(self):
        """GET /nextapi/candidates?education=12th+Pass - Filter by education_level"""
        res = requests.get(f"{BASE_URL}/nextapi/candidates?education=12th+Pass")
        assert res.status_code == 200
        data = res.json()
        assert "candidates" in data
        # All returned candidates should have education_level = "12th Pass"
        for candidate in data["candidates"]:
            assert candidate.get("education_level") == "12th Pass", f"Expected '12th Pass', got '{candidate.get('education_level')}'"
        print(f"✓ Education filter returned {data['total']} candidates with '12th Pass'")

    def test_filter_by_english_level(self):
        """GET /nextapi/candidates?english=Basic+English - Filter by english_level"""
        res = requests.get(f"{BASE_URL}/nextapi/candidates?english=Basic+English")
        assert res.status_code == 200
        data = res.json()
        assert "candidates" in data
        # All returned candidates should have english_level = "Basic English"
        for candidate in data["candidates"]:
            assert candidate.get("english_level") == "Basic English", f"Expected 'Basic English', got '{candidate.get('english_level')}'"
        print(f"✓ English filter returned {data['total']} candidates with 'Basic English'")

    def test_filter_by_experience_type(self):
        """GET /nextapi/candidates?experience=Experienced - Filter by experience_type"""
        res = requests.get(f"{BASE_URL}/nextapi/candidates?experience=Experienced")
        assert res.status_code == 200
        data = res.json()
        assert "candidates" in data
        # All returned candidates should have experience_type = "Experienced"
        for candidate in data["candidates"]:
            assert candidate.get("experience_type") == "Experienced", f"Expected 'Experienced', got '{candidate.get('experience_type')}'"
        print(f"✓ Experience filter returned {data['total']} candidates with 'Experienced'")

    def test_filter_by_verified_only(self):
        """GET /nextapi/candidates?verified=true - Filter verified only"""
        res = requests.get(f"{BASE_URL}/nextapi/candidates?verified=true")
        assert res.status_code == 200
        data = res.json()
        assert "candidates" in data
        # All returned candidates should have verification_status = "Verified"
        for candidate in data["candidates"]:
            assert candidate.get("verification_status") == "Verified", f"Expected 'Verified', got '{candidate.get('verification_status')}'"
        print(f"✓ Verified filter returned {data['total']} verified candidates")

    def test_filter_all_returns_unfiltered(self):
        """GET /nextapi/candidates with no filters returns all candidates"""
        res = requests.get(f"{BASE_URL}/nextapi/candidates")
        assert res.status_code == 200
        data = res.json()
        assert "candidates" in data
        assert data["total"] > 0
        print(f"✓ Unfiltered request returned {data['total']} total candidates")

    def test_filter_with_all_education_ignored(self):
        """GET /nextapi/candidates?education=All - 'All' should not filter"""
        res_all = requests.get(f"{BASE_URL}/nextapi/candidates?education=All")
        res_none = requests.get(f"{BASE_URL}/nextapi/candidates")
        assert res_all.status_code == 200
        assert res_none.status_code == 200
        # Both should return same count when "All" is used
        assert res_all.json()["total"] == res_none.json()["total"]
        print(f"✓ 'All' filter correctly ignored, returned {res_all.json()['total']} candidates")

    def test_combined_filters(self):
        """Test multiple filters combined"""
        res = requests.get(f"{BASE_URL}/nextapi/candidates?education=12th+Pass&english=Basic+English")
        assert res.status_code == 200
        data = res.json()
        for candidate in data["candidates"]:
            assert candidate.get("education_level") == "12th Pass"
            assert candidate.get("english_level") == "Basic English"
        print(f"✓ Combined filters returned {data['total']} candidates")


class TestManualEntryKYCFields:
    """Test that manual entry saves KYC fields correctly via POST /nextapi/upload-audio"""

    def test_manual_entry_saves_kyc_fields(self):
        """POST /nextapi/upload-audio - Manual entry saves education_level, english_level, experience_type"""
        # Create a minimal audio blob for manual entry
        form_data = {
            "language": "en",
            "lang_code": "en",
            "interview_type": "manual",
            "extracted_name": "TEST_KYC_Manual_Entry",
            "extracted_role": "Driver",
            "extracted_experience": "5",
            "extracted_summary": "Test KYC fields manual entry",
            "address": "Test Address 123",
            "will_relocate": "true",
            "education_level": "Graduate",
            "english_level": "Good English",
            "experience_type": "Experienced",
            "lat": "28.6139",
            "lng": "77.2090"
        }
        
        # Create empty audio blob
        files = {"audio": ("manual.webm", BytesIO(b""), "audio/webm")}
        
        res = requests.post(f"{BASE_URL}/nextapi/upload-audio", data=form_data, files=files)
        assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
        data = res.json()
        assert data.get("success") == True
        assert "candidateId" in data
        
        candidate_id = data["candidateId"]
        
        # Verify the candidate was created with correct KYC fields
        verify_res = requests.get(f"{BASE_URL}/nextapi/candidates")
        assert verify_res.status_code == 200
        candidates = verify_res.json()["candidates"]
        
        # Find the created candidate
        created_candidate = None
        for c in candidates:
            if c.get("_id") == candidate_id:
                created_candidate = c
                break
        
        assert created_candidate is not None, f"Could not find created candidate {candidate_id}"
        assert created_candidate.get("education_level") == "Graduate", f"Expected 'Graduate', got '{created_candidate.get('education_level')}'"
        assert created_candidate.get("english_level") == "Good English", f"Expected 'Good English', got '{created_candidate.get('english_level')}'"
        assert created_candidate.get("experience_type") == "Experienced", f"Expected 'Experienced', got '{created_candidate.get('experience_type')}'"
        print(f"✓ Manual entry created candidate {candidate_id} with correct KYC fields")


class TestCandidateIdUpload:
    """Test ID document upload for candidates"""

    def test_upload_id_sets_pending_status(self):
        """POST /nextapi/candidates/upload-id - Upload ID document sets verification_status to Pending"""
        # First create a test candidate
        form_data = {
            "language": "en",
            "lang_code": "en",
            "interview_type": "manual",
            "extracted_name": "TEST_ID_Upload_Candidate",
            "address": "Test Address",
            "education_level": "Diploma",
            "english_level": "Basic English",
            "experience_type": "Fresher"
        }
        files = {"audio": ("manual.webm", BytesIO(b""), "audio/webm")}
        create_res = requests.post(f"{BASE_URL}/nextapi/upload-audio", data=form_data, files=files)
        assert create_res.status_code == 201
        candidate_id = create_res.json()["candidateId"]
        
        # Upload ID document (fake JPG)
        id_file_content = b'\xff\xd8\xff\xe0\x00\x10JFIF' + b'\x00' * 100  # Minimal JPEG header
        id_form = {"candidate_id": candidate_id}
        id_files = {"document": ("test_id.jpg", BytesIO(id_file_content), "image/jpeg")}
        
        upload_res = requests.post(f"{BASE_URL}/nextapi/candidates/upload-id", data=id_form, files=id_files)
        assert upload_res.status_code == 201, f"Expected 201, got {upload_res.status_code}: {upload_res.text}"
        upload_data = upload_res.json()
        assert upload_data.get("success") == True
        assert upload_data.get("verification_status") == "Pending"
        assert "document_url" in upload_data
        print(f"✓ ID upload set verification_status to 'Pending' for {candidate_id}")

    def test_upload_id_requires_candidate_id(self):
        """POST /nextapi/candidates/upload-id - Requires candidate_id"""
        id_file_content = b'\xff\xd8\xff\xe0\x00\x10JFIF' + b'\x00' * 100
        id_files = {"document": ("test_id.jpg", BytesIO(id_file_content), "image/jpeg")}
        
        res = requests.post(f"{BASE_URL}/nextapi/candidates/upload-id", files=id_files)
        assert res.status_code == 400
        assert "candidate_id" in res.json().get("error", "").lower()
        print(f"✓ ID upload correctly rejects missing candidate_id")

    def test_upload_id_requires_document(self):
        """POST /nextapi/candidates/upload-id - Requires document file"""
        res = requests.post(f"{BASE_URL}/nextapi/candidates/upload-id", data={"candidate_id": "test123"})
        assert res.status_code == 400
        print(f"✓ ID upload correctly rejects missing document")


class TestCandidateKYCAdminActions:
    """Test admin approve/reject for candidate KYC"""

    def test_admin_approve_sets_verified(self):
        """PATCH /nextapi/candidates - Admin approve sets status to Verified"""
        # First create a test candidate with ID uploaded
        form_data = {
            "language": "en",
            "lang_code": "en",
            "interview_type": "manual",
            "extracted_name": "TEST_Admin_Approve_Candidate",
            "address": "Test Address"
        }
        files = {"audio": ("manual.webm", BytesIO(b""), "audio/webm")}
        create_res = requests.post(f"{BASE_URL}/nextapi/upload-audio", data=form_data, files=files)
        assert create_res.status_code == 201
        candidate_id = create_res.json()["candidateId"]
        
        # Upload ID to set Pending status
        id_file_content = b'\xff\xd8\xff\xe0\x00\x10JFIF' + b'\x00' * 100
        id_files = {"document": ("test_id.jpg", BytesIO(id_file_content), "image/jpeg")}
        requests.post(f"{BASE_URL}/nextapi/candidates/upload-id", data={"candidate_id": candidate_id}, files=id_files)
        
        # Admin approve
        approve_res = requests.patch(f"{BASE_URL}/nextapi/candidates", json={
            "candidate_id": candidate_id,
            "action": "approve"
        })
        assert approve_res.status_code == 200, f"Expected 200, got {approve_res.status_code}: {approve_res.text}"
        approve_data = approve_res.json()
        assert approve_data.get("success") == True
        assert approve_data.get("verification_status") == "Verified"
        print(f"✓ Admin approve set status to 'Verified' for {candidate_id}")

    def test_admin_reject_sets_unverified(self):
        """PATCH /nextapi/candidates - Admin reject sets status to Unverified"""
        # Create test candidate
        form_data = {
            "language": "en",
            "lang_code": "en",
            "interview_type": "manual",
            "extracted_name": "TEST_Admin_Reject_Candidate",
            "address": "Test Address"
        }
        files = {"audio": ("manual.webm", BytesIO(b""), "audio/webm")}
        create_res = requests.post(f"{BASE_URL}/nextapi/upload-audio", data=form_data, files=files)
        candidate_id = create_res.json()["candidateId"]
        
        # Upload ID
        id_file_content = b'\xff\xd8\xff\xe0\x00\x10JFIF' + b'\x00' * 100
        id_files = {"document": ("test_id.jpg", BytesIO(id_file_content), "image/jpeg")}
        requests.post(f"{BASE_URL}/nextapi/candidates/upload-id", data={"candidate_id": candidate_id}, files=id_files)
        
        # Admin reject
        reject_res = requests.patch(f"{BASE_URL}/nextapi/candidates", json={
            "candidate_id": candidate_id,
            "action": "reject"
        })
        assert reject_res.status_code == 200
        reject_data = reject_res.json()
        assert reject_data.get("success") == True
        assert reject_data.get("verification_status") == "Unverified"
        print(f"✓ Admin reject set status to 'Unverified' for {candidate_id}")

    def test_admin_action_requires_candidate_id(self):
        """PATCH /nextapi/candidates - Requires candidate_id"""
        res = requests.patch(f"{BASE_URL}/nextapi/candidates", json={"action": "approve"})
        assert res.status_code == 400
        print(f"✓ Admin action correctly rejects missing candidate_id")

    def test_admin_action_requires_valid_action(self):
        """PATCH /nextapi/candidates - Requires valid action (approve/reject)"""
        res = requests.patch(f"{BASE_URL}/nextapi/candidates", json={
            "candidate_id": VERIFIED_CANDIDATE_ID,
            "action": "invalid_action"
        })
        assert res.status_code == 400
        print(f"✓ Admin action correctly rejects invalid action")


class TestExistingVerifiedCandidate:
    """Test the pre-seeded verified candidate exists with correct fields"""

    def test_verified_candidate_exists(self):
        """Verify test candidate ad1c43f5-991e-407f-ac94-a7141c5bd672 has all expected fields"""
        res = requests.get(f"{BASE_URL}/nextapi/candidates")
        assert res.status_code == 200
        
        candidates = res.json()["candidates"]
        verified_candidate = None
        for c in candidates:
            if c.get("_id") == VERIFIED_CANDIDATE_ID:
                verified_candidate = c
                break
        
        assert verified_candidate is not None, f"Verified candidate {VERIFIED_CANDIDATE_ID} not found"
        assert verified_candidate.get("verification_status") == "Verified"
        assert verified_candidate.get("education_level") == "12th Pass"
        assert verified_candidate.get("english_level") == "Basic English"
        assert verified_candidate.get("experience_type") == "Experienced"
        assert verified_candidate.get("id_document_url") is not None
        print(f"✓ Verified candidate {VERIFIED_CANDIDATE_ID} has all expected KYC fields")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
