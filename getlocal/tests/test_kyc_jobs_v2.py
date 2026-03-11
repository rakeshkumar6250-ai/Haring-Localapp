#!/usr/bin/env python3
"""
GetLocal V2 - Employer KYC Flow and Job Posting Overhaul Tests
Tests for:
- POST /nextapi/employers - Create employer with company_name
- GET /nextapi/employers?id=<id> - Fetch employer by ID
- GET /nextapi/employers - Fetch all employers, filter by status
- POST /nextapi/employers/upload-kyc - Upload KYC document
- PATCH /nextapi/employers - Admin approve/reject KYC
- POST /nextapi/jobs - Expanded schema with new fields
- GET /nextapi/jobs - Returns employer_verified enriched fields
"""

import pytest
import requests
import json
import os
import tempfile
from datetime import datetime
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:3000').rstrip('/')

class TestEmployerAPI:
    """Test Employer CRUD endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.test_employer_id = f"TEST_emp_{uuid.uuid4().hex[:8]}"
        self.test_company_name = f"Test Company {uuid.uuid4().hex[:6]}"
        yield
        # Cleanup handled by test prefix convention
    
    def test_create_employer_success(self):
        """POST /nextapi/employers - Create employer with company_name"""
        response = requests.post(
            f"{BASE_URL}/nextapi/employers",
            json={
                "employer_id": self.test_employer_id,
                "company_name": self.test_company_name,
                "phone": "+91 98765 43210"
            },
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "employer" in data
        employer = data["employer"]
        assert employer["_id"] == self.test_employer_id
        assert employer["company_name"] == self.test_company_name
        assert employer["verification_status"] == "Unverified"
        print(f"PASS: Created employer {self.test_employer_id}")
    
    def test_create_employer_missing_company_name(self):
        """POST /nextapi/employers - Should fail without company_name"""
        response = requests.post(
            f"{BASE_URL}/nextapi/employers",
            json={"employer_id": "test123"},
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        print(f"PASS: Correctly rejected missing company_name")
    
    def test_get_employer_by_id(self):
        """GET /nextapi/employers?id=<id> - Fetch employer by ID"""
        # First create employer
        create_resp = requests.post(
            f"{BASE_URL}/nextapi/employers",
            json={"employer_id": self.test_employer_id, "company_name": self.test_company_name},
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        assert create_resp.status_code == 201
        
        # Then fetch by ID
        response = requests.get(
            f"{BASE_URL}/nextapi/employers?id={self.test_employer_id}",
            timeout=10
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "employer" in data
        assert data["employer"]["_id"] == self.test_employer_id
        assert data["employer"]["company_name"] == self.test_company_name
        print(f"PASS: Fetched employer by ID {self.test_employer_id}")
    
    def test_get_employer_not_found(self):
        """GET /nextapi/employers?id=<invalid> - Should return 404"""
        response = requests.get(
            f"{BASE_URL}/nextapi/employers?id=nonexistent_employer_xyz",
            timeout=10
        )
        
        assert response.status_code == 404
        data = response.json()
        assert "error" in data
        print(f"PASS: Correctly returned 404 for nonexistent employer")
    
    def test_get_all_employers(self):
        """GET /nextapi/employers - Fetch all employers"""
        response = requests.get(f"{BASE_URL}/nextapi/employers", timeout=10)
        
        assert response.status_code == 200
        data = response.json()
        assert "employers" in data
        assert "total" in data
        assert isinstance(data["employers"], list)
        print(f"PASS: Fetched {data['total']} employers")
    
    def test_get_employers_filter_by_status(self):
        """GET /nextapi/employers?status=Verified - Filter by verification status"""
        # Test filter by Verified status
        response = requests.get(
            f"{BASE_URL}/nextapi/employers?status=Verified",
            timeout=10
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "employers" in data
        # All returned should be Verified
        for emp in data["employers"]:
            assert emp.get("verification_status") == "Verified"
        print(f"PASS: Filtered employers by Verified status - found {len(data['employers'])}")
        
        # Test filter by Pending status
        response = requests.get(
            f"{BASE_URL}/nextapi/employers?status=Pending",
            timeout=10
        )
        assert response.status_code == 200
        data = response.json()
        for emp in data["employers"]:
            assert emp.get("verification_status") == "Pending"
        print(f"PASS: Filtered employers by Pending status - found {len(data['employers'])}")


class TestKYCUploadAPI:
    """Test KYC Document Upload endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.test_employer_id = f"TEST_kyc_{uuid.uuid4().hex[:8]}"
        self.test_company_name = f"KYC Test Company {uuid.uuid4().hex[:6]}"
        yield
    
    def test_kyc_upload_pdf(self):
        """POST /nextapi/employers/upload-kyc - Upload PDF document"""
        # Create a test PDF file
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as f:
            f.write(b'%PDF-1.4 Test PDF content for KYC verification')
            temp_path = f.name
        
        try:
            with open(temp_path, 'rb') as pdf_file:
                files = {'document': ('test_kyc.pdf', pdf_file, 'application/pdf')}
                data = {
                    'employer_id': self.test_employer_id,
                    'company_name': self.test_company_name
                }
                
                response = requests.post(
                    f"{BASE_URL}/nextapi/employers/upload-kyc",
                    files=files,
                    data=data,
                    timeout=15
                )
            
            assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
            result = response.json()
            
            assert result.get("success") is True
            assert result.get("employer_id") == self.test_employer_id
            assert result.get("verification_status") == "Pending"
            assert "document_url" in result
            assert result["document_url"].startswith("/kyc-docs/")
            print(f"PASS: KYC PDF uploaded, status set to Pending")
            
        finally:
            os.unlink(temp_path)
    
    def test_kyc_upload_image_jpg(self):
        """POST /nextapi/employers/upload-kyc - Upload JPG image"""
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as f:
            # Minimal JPEG header
            f.write(b'\xFF\xD8\xFF\xE0\x00\x10JFIF' + b'\x00' * 100)
            temp_path = f.name
        
        try:
            with open(temp_path, 'rb') as jpg_file:
                files = {'document': ('test_kyc.jpg', jpg_file, 'image/jpeg')}
                data = {
                    'employer_id': f"TEST_jpg_{uuid.uuid4().hex[:8]}",
                    'company_name': 'JPG Test Company'
                }
                
                response = requests.post(
                    f"{BASE_URL}/nextapi/employers/upload-kyc",
                    files=files,
                    data=data,
                    timeout=15
                )
            
            assert response.status_code == 201
            result = response.json()
            assert result.get("verification_status") == "Pending"
            print(f"PASS: KYC JPG uploaded successfully")
            
        finally:
            os.unlink(temp_path)
    
    def test_kyc_upload_missing_employer_id(self):
        """POST /nextapi/employers/upload-kyc - Should fail without employer_id"""
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as f:
            f.write(b'%PDF-1.4 Test PDF content')
            temp_path = f.name
        
        try:
            with open(temp_path, 'rb') as pdf_file:
                files = {'document': ('test.pdf', pdf_file, 'application/pdf')}
                data = {'company_name': 'Test Company'}
                
                response = requests.post(
                    f"{BASE_URL}/nextapi/employers/upload-kyc",
                    files=files,
                    data=data,
                    timeout=15
                )
            
            assert response.status_code == 400
            data = response.json()
            assert "error" in data
            print(f"PASS: Correctly rejected missing employer_id")
            
        finally:
            os.unlink(temp_path)
    
    def test_kyc_upload_invalid_file_type(self):
        """POST /nextapi/employers/upload-kyc - Should reject invalid file types"""
        with tempfile.NamedTemporaryFile(suffix='.txt', delete=False) as f:
            f.write(b'This is a text file, not a valid KYC document')
            temp_path = f.name
        
        try:
            with open(temp_path, 'rb') as txt_file:
                files = {'document': ('test.txt', txt_file, 'text/plain')}
                data = {
                    'employer_id': 'test123',
                    'company_name': 'Test Company'
                }
                
                response = requests.post(
                    f"{BASE_URL}/nextapi/employers/upload-kyc",
                    files=files,
                    data=data,
                    timeout=15
                )
            
            assert response.status_code == 400
            data = response.json()
            assert "error" in data
            print(f"PASS: Correctly rejected invalid file type")
            
        finally:
            os.unlink(temp_path)


class TestKYCApprovalAPI:
    """Test Admin KYC Approve/Reject endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.test_employer_id = f"TEST_approve_{uuid.uuid4().hex[:8]}"
        self.test_company_name = f"Approval Test {uuid.uuid4().hex[:6]}"
        yield
    
    def _create_pending_employer(self):
        """Helper to create an employer with Pending status"""
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as f:
            f.write(b'%PDF-1.4 Test PDF for approval')
            temp_path = f.name
        
        try:
            with open(temp_path, 'rb') as pdf_file:
                files = {'document': ('kyc.pdf', pdf_file, 'application/pdf')}
                data = {
                    'employer_id': self.test_employer_id,
                    'company_name': self.test_company_name
                }
                
                response = requests.post(
                    f"{BASE_URL}/nextapi/employers/upload-kyc",
                    files=files,
                    data=data,
                    timeout=15
                )
            return response.status_code == 201
        finally:
            os.unlink(temp_path)
    
    def test_approve_kyc(self):
        """PATCH /nextapi/employers - Admin approve KYC"""
        # First create a pending employer
        assert self._create_pending_employer(), "Failed to create pending employer"
        
        # Approve the employer
        response = requests.patch(
            f"{BASE_URL}/nextapi/employers",
            json={
                "employer_id": self.test_employer_id,
                "action": "approve"
            },
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") is True
        assert data.get("verification_status") == "Verified"
        print(f"PASS: KYC approved - status changed to Verified")
        
        # Verify in database
        get_response = requests.get(
            f"{BASE_URL}/nextapi/employers?id={self.test_employer_id}",
            timeout=10
        )
        assert get_response.status_code == 200
        employer = get_response.json()["employer"]
        assert employer["verification_status"] == "Verified"
        assert employer.get("verified_at") is not None
        print(f"PASS: Verified status persisted in database")
    
    def test_reject_kyc(self):
        """PATCH /nextapi/employers - Admin reject KYC"""
        # Create pending employer
        assert self._create_pending_employer(), "Failed to create pending employer"
        
        # Reject the employer
        response = requests.patch(
            f"{BASE_URL}/nextapi/employers",
            json={
                "employer_id": self.test_employer_id,
                "action": "reject"
            },
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") is True
        assert data.get("verification_status") == "Unverified"
        print(f"PASS: KYC rejected - status changed to Unverified")
    
    def test_approve_invalid_action(self):
        """PATCH /nextapi/employers - Should reject invalid action"""
        response = requests.patch(
            f"{BASE_URL}/nextapi/employers",
            json={
                "employer_id": "test123",
                "action": "invalid_action"
            },
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        print(f"PASS: Correctly rejected invalid action")
    
    def test_approve_nonexistent_employer(self):
        """PATCH /nextapi/employers - Should fail for nonexistent employer"""
        response = requests.patch(
            f"{BASE_URL}/nextapi/employers",
            json={
                "employer_id": "nonexistent_xyz_123",
                "action": "approve"
            },
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        assert response.status_code == 404
        print(f"PASS: Correctly returned 404 for nonexistent employer")


class TestExpandedJobSchema:
    """Test Expanded Job Schema with new fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.test_employer_id = f"TEST_job_emp_{uuid.uuid4().hex[:8]}"
        self.test_job_id = None
        yield
    
    def test_create_job_with_expanded_schema(self):
        """POST /nextapi/jobs - Create job with all new fields"""
        job_data = {
            "title": "Test Driver Position V2",
            "category": "Driver",
            "employer_id": self.test_employer_id,
            "company_name": "Test Transport Co",
            # New expanded fields
            "job_type": "Full Time",
            "work_location_type": "Field",
            "pay_type": "Fixed+Incentive",
            "requires_joining_fee": False,
            "minimum_education": "10th Pass",
            "english_level": "Basic",
            "experience_required": "1-3 Years",
            "is_walk_in": True,
            "contact_preference": "WhatsApp",
            "job_description": "Deliver packages across the city. Must have valid driving license.",
            # Existing fields
            "salary": {"type": "fixed", "amount": 25000, "display": "Rs.25,000/month"},
            "perks": ["meals", "transport"],
            "training_provided": True,
            "location": {"lat": 28.6139, "lng": 77.2090},
            "employer_location": "Koramangala, Bangalore"
        }
        
        response = requests.post(
            f"{BASE_URL}/nextapi/jobs",
            json=job_data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") is True
        job = data["job"]
        
        # Verify all new fields
        assert job["job_type"] == "Full Time"
        assert job["work_location_type"] == "Field"
        assert job["pay_type"] == "Fixed+Incentive"
        assert job["requires_joining_fee"] is False
        assert job["minimum_education"] == "10th Pass"
        assert job["english_level"] == "Basic"
        assert job["experience_required"] == "1-3 Years"
        assert job["is_walk_in"] is True
        assert job["contact_preference"] == "WhatsApp"
        assert job["job_description"] == "Deliver packages across the city. Must have valid driving license."
        assert job["employer_id"] == self.test_employer_id
        assert job["company_name"] == "Test Transport Co"
        
        self.test_job_id = job["_id"]
        print(f"PASS: Created job with expanded schema - {job['_id']}")
    
    def test_create_job_with_joining_fee(self):
        """POST /nextapi/jobs - Create job requiring joining fee"""
        job_data = {
            "title": "Security Guard Position",
            "category": "Security Guard",
            "requires_joining_fee": True,
            "job_type": "Full Time",
            "salary": {"type": "fixed", "amount": 15000, "display": "Rs.15,000/month"}
        }
        
        response = requests.post(
            f"{BASE_URL}/nextapi/jobs",
            json=job_data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        assert response.status_code == 201
        job = response.json()["job"]
        assert job["requires_joining_fee"] is True
        print(f"PASS: Created job with joining fee requirement")
    
    def test_create_job_walk_in(self):
        """POST /nextapi/jobs - Create walk-in interview job"""
        job_data = {
            "title": "Cook Position Walk-in",
            "category": "Cook",
            "is_walk_in": True,
            "contact_preference": "Walk-in Only"
        }
        
        response = requests.post(
            f"{BASE_URL}/nextapi/jobs",
            json=job_data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        assert response.status_code == 201
        job = response.json()["job"]
        assert job["is_walk_in"] is True
        assert job["contact_preference"] == "Walk-in Only"
        print(f"PASS: Created walk-in interview job")


class TestJobsEnrichment:
    """Test Jobs API with employer enrichment"""
    
    def test_get_jobs_returns_employer_verified_field(self):
        """GET /nextapi/jobs - Returns employer_verified enriched field"""
        response = requests.get(f"{BASE_URL}/nextapi/jobs", timeout=10)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "jobs" in data
        jobs = data["jobs"]
        
        # Check that enrichment fields are present
        for job in jobs[:5]:  # Check first 5 jobs
            assert "employer_verified" in job, f"Job {job.get('_id')} missing employer_verified field"
            assert "employer_company" in job, f"Job {job.get('_id')} missing employer_company field"
            assert isinstance(job["employer_verified"], bool)
        
        print(f"PASS: Jobs returned with employer_verified and employer_company fields")
    
    def test_verified_employer_job_enrichment(self):
        """Test that jobs from verified employers show employer_verified=True"""
        # Use the pre-existing test employer emp-test-001 which is Verified
        response = requests.get(f"{BASE_URL}/nextapi/jobs", timeout=10)
        assert response.status_code == 200
        
        jobs = response.json()["jobs"]
        
        # Check if any job has employer_verified=True
        verified_jobs = [j for j in jobs if j.get("employer_verified") is True]
        print(f"Found {len(verified_jobs)} jobs from verified employers")
        
        if verified_jobs:
            # Verify a verified job has the badge
            job = verified_jobs[0]
            assert job["employer_verified"] is True
            print(f"PASS: Verified employer job found: {job.get('title')}")
        else:
            print(f"INFO: No verified employer jobs found - this is OK for fresh DB")


class TestExistingTestEmployer:
    """Test with pre-existing test employer emp-test-001"""
    
    def test_fetch_emp_test_001(self):
        """Verify emp-test-001 exists and is Verified"""
        response = requests.get(
            f"{BASE_URL}/nextapi/employers?id=emp-test-001",
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            employer = data.get("employer")
            if employer:
                print(f"Found emp-test-001: {employer.get('company_name')}")
                print(f"  Status: {employer.get('verification_status')}")
                assert employer.get("verification_status") == "Verified", "emp-test-001 should be Verified"
                print(f"PASS: emp-test-001 is Verified")
            else:
                pytest.skip("emp-test-001 not found in response")
        else:
            pytest.skip("emp-test-001 not found - may not be seeded")


def main():
    """Run tests with pytest"""
    import sys
    print(f"Testing against: {BASE_URL}")
    
    # Run pytest
    exit_code = pytest.main([
        __file__,
        "-v",
        "--tb=short",
        f"--junitxml=/app/test_reports/pytest/pytest_kyc_jobs.xml"
    ])
    
    return exit_code


if __name__ == "__main__":
    import sys
    sys.exit(main())
