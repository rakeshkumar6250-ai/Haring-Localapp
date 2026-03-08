#!/usr/bin/env python3

import requests
import sys
import json
import time
from datetime import datetime

class GetLocalJobAPITester:
    def __init__(self, base_url="http://localhost:3000"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_job_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        default_headers = {'Content-Type': 'application/json'}
        if headers:
            default_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers, timeout=10)
            elif method == 'POST':
                print(f"   Data: {json.dumps(data, indent=2)}")
                response = requests.post(url, json=data, headers=default_headers, timeout=10)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=default_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=default_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)}")
                    return True, response_data
                except:
                    print(f"   Response: {response.text[:200]}...")
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {json.dumps(error_data, indent=2)}")
                except:
                    print(f"   Error: {response.text[:200]}...")
                return False, {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_get_jobs(self):
        """Test GET /nextapi/jobs - should return jobs list with categories"""
        success, response = self.run_test(
            "Get Jobs List",
            "GET",
            "nextapi/jobs",
            200
        )
        
        if success:
            # Validate response structure
            if 'jobs' in response and 'categories' in response:
                print("✅ Response structure is correct")
                print(f"   Jobs count: {len(response.get('jobs', []))}")
                print(f"   Categories: {response.get('categories', [])}")
            else:
                print("❌ Missing required fields in response")
                return False
        
        return success

    def test_create_job_valid(self):
        """Test POST /nextapi/jobs with valid data"""
        job_data = {
            "title": "Test Driver Position - Backend Test",
            "category": "Driver", 
            "required_experience": 2,
            "location_radius": 15,
            "location": {
                "lat": 28.6139,
                "lng": 77.2090
            }
        }
        
        success, response = self.run_test(
            "Create Job - Valid Data",
            "POST", 
            "nextapi/jobs",
            201,
            data=job_data
        )
        
        if success and response.get('success') and 'job' in response:
            job = response['job']
            self.created_job_id = job.get('_id')
            
            # Validate job fields
            required_fields = ['_id', 'title', 'category', 'required_experience', 'location_radius', 'is_active', 'status', 'created_at']
            missing_fields = [field for field in required_fields if field not in job]
            
            if not missing_fields:
                print("✅ All required fields present in created job")
                if job['is_active'] == True and job['status'] == 'active':
                    print("✅ Job created with is_active=true and status=active")
                else:
                    print(f"❌ Job not created as active: is_active={job.get('is_active')}, status={job.get('status')}")
                    return False
            else:
                print(f"❌ Missing fields in created job: {missing_fields}")
                return False
        
        return success

    def test_create_job_missing_title(self):
        """Test POST /nextapi/jobs with missing title"""
        job_data = {
            "category": "Driver", 
            "required_experience": 2,
            "location_radius": 15
        }
        
        success, response = self.run_test(
            "Create Job - Missing Title",
            "POST", 
            "nextapi/jobs",
            400,
            data=job_data
        )
        
        if success and 'error' in response:
            print("✅ Proper error handling for missing title")
        
        return success

    def test_create_job_missing_category(self):
        """Test POST /nextapi/jobs with missing category"""
        job_data = {
            "title": "Test Position",
            "required_experience": 2,
            "location_radius": 15
        }
        
        success, response = self.run_test(
            "Create Job - Missing Category", 
            "POST",
            "nextapi/jobs",
            400,
            data=job_data
        )
        
        if success and 'error' in response:
            print("✅ Proper error handling for missing category")
        
        return success

    def test_update_job_status(self):
        """Test PATCH /nextapi/jobs to update job status"""
        if not self.created_job_id:
            print("❌ Skipping job update test - no job created")
            return False
            
        update_data = {
            "jobId": self.created_job_id,
            "is_active": False
        }
        
        success, response = self.run_test(
            "Update Job Status",
            "PATCH",
            "nextapi/jobs", 
            200,
            data=update_data
        )
        
        if success and response.get('success'):
            print("✅ Job status updated successfully")
        
        return success

    def test_delete_job(self):
        """Test DELETE /nextapi/jobs"""
        if not self.created_job_id:
            print("❌ Skipping job deletion test - no job created")
            return False
            
        success, response = self.run_test(
            "Delete Job",
            "DELETE",
            f"nextapi/jobs?jobId={self.created_job_id}",
            200
        )
        
        if success and response.get('success'):
            print("✅ Job deleted successfully")
        
        return success

    def test_get_jobs_after_creation(self):
        """Test that created job appears in jobs list"""
        if not self.created_job_id:
            print("❌ Skipping job list verification - no job created")
            return False
            
        # Wait a bit for the job to be indexed
        time.sleep(0.5)
        
        success, response = self.run_test(
            "Verify Job in List",
            "GET",
            "nextapi/jobs", 
            200
        )
        
        if success and 'jobs' in response:
            jobs = response['jobs']
            found_job = None
            for job in jobs:
                if job.get('_id') == self.created_job_id:
                    found_job = job
                    break
            
            if found_job:
                print("✅ Created job found in jobs list")
                if found_job.get('is_active') == True:
                    print("✅ Job is active in the list")
                else:
                    print(f"❌ Job is not active: is_active={found_job.get('is_active')}")
                    return False
            else:
                print("❌ Created job not found in jobs list")
                return False
        
        return success

def main():
    """Run all API tests"""
    print("🚀 Starting GetLocal Job API Tests")
    print("=" * 50)
    
    tester = GetLocalJobAPITester()
    
    # Test sequence
    test_results = []
    
    # Basic functionality tests
    test_results.append(tester.test_get_jobs())
    test_results.append(tester.test_create_job_valid())
    test_results.append(tester.test_get_jobs_after_creation())
    
    # Error handling tests
    test_results.append(tester.test_create_job_missing_title())
    test_results.append(tester.test_create_job_missing_category())
    
    # Job management tests
    test_results.append(tester.test_update_job_status())
    test_results.append(tester.test_delete_job())
    
    # Print summary
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        failed_tests = tester.tests_run - tester.tests_passed
        print(f"❌ {failed_tests} test(s) failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())