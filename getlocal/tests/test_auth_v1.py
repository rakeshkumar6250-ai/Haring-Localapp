"""
Test suite for GetLocal V2 Auth Features
Tests: Signup, OTP Verification, Login, Auth-protected routes, JWT validation
Mock OTP: 123456
"""

import pytest
import requests
import time
import uuid

BASE_URL = "http://localhost:3001"

# ───────────────────────────────────────────────
# Test Data
# ───────────────────────────────────────────────

# Existing test accounts from DB
EXISTING_ACCOUNT = {
    "phone": "9876543210",
    "password": "test123",
    "company_name": "Test Corp"
}

EXISTING_ACCOUNT_2 = {
    "phone": "9111222333",
    "password": "flow123",
    "company_name": "FlowTest Corp"
}

# Mock OTP always accepted
MOCK_OTP = "123456"

# ───────────────────────────────────────────────
# Fixtures
# ───────────────────────────────────────────────

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def unique_phone():
    """Generate unique phone for signup tests"""
    ts = str(int(time.time()))[-6:]
    return f"9{ts}1234"

@pytest.fixture(scope="module")
def fresh_signup_data(unique_phone):
    """Data for a fresh signup"""
    return {
        "phone": unique_phone,
        "company_name": f"TestCompany_{unique_phone}",
        "password": "testpass123"
    }

# ───────────────────────────────────────────────
# 1. SIGNUP API TESTS
# ───────────────────────────────────────────────

class TestSignup:
    """POST /nextapi/auth/signup tests"""
    
    def test_signup_missing_fields(self, api_client):
        """Signup with missing fields returns 400"""
        # Missing password
        response = api_client.post(f"{BASE_URL}/nextapi/auth/signup", json={
            "phone": "9999999999",
            "company_name": "Test"
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "error" in data
        print(f"PASS: Missing password returns 400 - {data['error']}")
        
        # Missing phone
        response = api_client.post(f"{BASE_URL}/nextapi/auth/signup", json={
            "company_name": "Test",
            "password": "123456"
        })
        assert response.status_code == 400
        print("PASS: Missing phone returns 400")
        
        # Missing company_name
        response = api_client.post(f"{BASE_URL}/nextapi/auth/signup", json={
            "phone": "9999999999",
            "password": "123456"
        })
        assert response.status_code == 400
        print("PASS: Missing company_name returns 400")
    
    def test_signup_short_password(self, api_client):
        """Password must be at least 6 characters"""
        response = api_client.post(f"{BASE_URL}/nextapi/auth/signup", json={
            "phone": "9999999991",
            "company_name": "Test",
            "password": "12345"  # 5 chars
        })
        assert response.status_code == 400
        data = response.json()
        assert "6 characters" in data.get("error", "").lower() or "password" in data.get("error", "").lower()
        print(f"PASS: Short password (5 chars) returns 400 - {data['error']}")
    
    def test_signup_duplicate_phone(self, api_client):
        """Duplicate phone number returns 409"""
        response = api_client.post(f"{BASE_URL}/nextapi/auth/signup", json={
            "phone": EXISTING_ACCOUNT["phone"],
            "company_name": "Duplicate Test",
            "password": "password123"
        })
        assert response.status_code == 409, f"Expected 409 for duplicate, got {response.status_code}: {response.text}"
        data = response.json()
        assert "exists" in data.get("error", "").lower() or "already" in data.get("error", "").lower()
        print(f"PASS: Duplicate phone returns 409 - {data['error']}")
    
    def test_signup_success_with_otp_hint(self, api_client, fresh_signup_data):
        """Valid signup returns success with mock OTP hint"""
        response = api_client.post(f"{BASE_URL}/nextapi/auth/signup", json=fresh_signup_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert "phone" in data
        assert "mock_hint" in data or "123456" in data.get("message", "")
        print(f"PASS: Signup success - phone: {data.get('phone')}, hint: {data.get('mock_hint')}")
        return data

# ───────────────────────────────────────────────
# 2. OTP VERIFICATION TESTS
# ───────────────────────────────────────────────

class TestOtpVerification:
    """POST /nextapi/auth/verify-otp tests"""
    
    def test_verify_otp_missing_fields(self, api_client):
        """Missing phone or otp returns 400"""
        response = api_client.post(f"{BASE_URL}/nextapi/auth/verify-otp", json={
            "phone": "9999999999"
        })
        assert response.status_code == 400
        print("PASS: Missing OTP returns 400")
        
        response = api_client.post(f"{BASE_URL}/nextapi/auth/verify-otp", json={
            "otp": "123456"
        })
        assert response.status_code == 400
        print("PASS: Missing phone returns 400")
    
    def test_verify_otp_no_pending_signup(self, api_client):
        """Verifying without signup returns 404"""
        response = api_client.post(f"{BASE_URL}/nextapi/auth/verify-otp", json={
            "phone": "9000000001",  # Random phone with no pending signup
            "otp": MOCK_OTP
        })
        assert response.status_code == 404
        data = response.json()
        assert "pending" in data.get("error", "").lower() or "sign up" in data.get("error", "").lower()
        print(f"PASS: No pending signup returns 404 - {data['error']}")
    
    def test_verify_otp_wrong_code(self, api_client):
        """Wrong OTP returns 401"""
        # First create a pending signup
        unique_phone = f"9{int(time.time())%100000}9999"
        api_client.post(f"{BASE_URL}/nextapi/auth/signup", json={
            "phone": unique_phone,
            "company_name": "WrongOTPTest",
            "password": "testpass123"
        })
        
        # Verify with wrong OTP
        response = api_client.post(f"{BASE_URL}/nextapi/auth/verify-otp", json={
            "phone": unique_phone,
            "otp": "000000"  # Wrong OTP
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        data = response.json()
        assert "invalid" in data.get("error", "").lower()
        print(f"PASS: Wrong OTP returns 401 - {data['error']}")
    
    def test_verify_otp_success_creates_employer_and_wallet(self, api_client):
        """Correct OTP creates employer, wallet, and returns JWT"""
        unique_phone = f"9{int(time.time())%100000}8888"
        company_name = f"VerifyTest_{unique_phone}"
        
        # Step 1: Signup
        signup_res = api_client.post(f"{BASE_URL}/nextapi/auth/signup", json={
            "phone": unique_phone,
            "company_name": company_name,
            "password": "testpass123"
        })
        assert signup_res.status_code == 200, f"Signup failed: {signup_res.text}"
        clean_phone = signup_res.json().get("phone")
        
        # Step 2: Verify OTP
        response = api_client.post(f"{BASE_URL}/nextapi/auth/verify-otp", json={
            "phone": clean_phone,
            "otp": MOCK_OTP
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True
        assert "token" in data, "JWT token missing"
        assert "employer" in data, "Employer data missing"
        
        employer = data["employer"]
        assert employer.get("company_name") == company_name
        assert employer.get("phone_verified") == True
        assert "id" in employer
        
        print(f"PASS: OTP verification success - employer_id: {employer['id']}, company: {employer['company_name']}")
        
        # Verify JWT works
        token = data["token"]
        me_res = api_client.get(f"{BASE_URL}/nextapi/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_res.status_code == 200, f"Auth/me failed with new token: {me_res.text}"
        print("PASS: JWT token is valid for /auth/me")
        
        return data

# ───────────────────────────────────────────────
# 3. LOGIN API TESTS
# ───────────────────────────────────────────────

class TestLogin:
    """POST /nextapi/auth/login tests"""
    
    def test_login_missing_fields(self, api_client):
        """Missing phone or password returns 400"""
        response = api_client.post(f"{BASE_URL}/nextapi/auth/login", json={
            "phone": "9876543210"
        })
        assert response.status_code == 400
        print("PASS: Missing password returns 400")
        
        response = api_client.post(f"{BASE_URL}/nextapi/auth/login", json={
            "password": "test123"
        })
        assert response.status_code == 400
        print("PASS: Missing phone returns 400")
    
    def test_login_wrong_phone(self, api_client):
        """Non-existent phone returns 404"""
        response = api_client.post(f"{BASE_URL}/nextapi/auth/login", json={
            "phone": "9000000000",  # Non-existent
            "password": "anypassword"
        })
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        data = response.json()
        assert "no account" in data.get("error", "").lower() or "not found" in data.get("error", "").lower()
        print(f"PASS: Wrong phone returns 404 - {data['error']}")
    
    def test_login_wrong_password(self, api_client):
        """Wrong password returns 401"""
        response = api_client.post(f"{BASE_URL}/nextapi/auth/login", json={
            "phone": EXISTING_ACCOUNT["phone"],
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        data = response.json()
        assert "incorrect" in data.get("error", "").lower() or "password" in data.get("error", "").lower()
        print(f"PASS: Wrong password returns 401 - {data['error']}")
    
    def test_login_success(self, api_client):
        """Correct credentials return JWT token"""
        response = api_client.post(f"{BASE_URL}/nextapi/auth/login", json={
            "phone": EXISTING_ACCOUNT["phone"],
            "password": EXISTING_ACCOUNT["password"]
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert "token" in data, "JWT token missing"
        assert "employer" in data, "Employer data missing"
        
        employer = data["employer"]
        assert "id" in employer
        assert employer.get("company_name") == EXISTING_ACCOUNT["company_name"]
        
        print(f"PASS: Login success - employer_id: {employer['id']}, company: {employer['company_name']}")
        return data

# ───────────────────────────────────────────────
# 4. AUTH/ME ENDPOINT TESTS
# ───────────────────────────────────────────────

class TestAuthMe:
    """GET /nextapi/auth/me tests"""
    
    def test_auth_me_no_token(self, api_client):
        """No token returns 401"""
        response = api_client.get(f"{BASE_URL}/nextapi/auth/me")
        assert response.status_code == 401
        data = response.json()
        assert "unauthorized" in data.get("error", "").lower()
        print("PASS: No token returns 401")
    
    def test_auth_me_invalid_token(self, api_client):
        """Invalid token returns 401"""
        response = api_client.get(f"{BASE_URL}/nextapi/auth/me", headers={
            "Authorization": "Bearer invalid.token.here"
        })
        assert response.status_code == 401
        print("PASS: Invalid token returns 401")
    
    def test_auth_me_valid_token(self, api_client):
        """Valid token returns employer profile"""
        # Login first
        login_res = api_client.post(f"{BASE_URL}/nextapi/auth/login", json={
            "phone": EXISTING_ACCOUNT["phone"],
            "password": EXISTING_ACCOUNT["password"]
        })
        assert login_res.status_code == 200
        token = login_res.json()["token"]
        
        # Get profile
        response = api_client.get(f"{BASE_URL}/nextapi/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "employer" in data
        employer = data["employer"]
        assert employer.get("company_name") == EXISTING_ACCOUNT["company_name"]
        assert "id" in employer
        assert "phone" in employer
        print(f"PASS: Auth/me returns profile - {employer['company_name']}")

# ───────────────────────────────────────────────
# 5. PROTECTED ROUTES TESTS (401 without auth)
# ───────────────────────────────────────────────

class TestProtectedRoutes:
    """All protected routes should return 401 without auth"""
    
    def test_wallet_get_without_auth(self, api_client):
        """GET /nextapi/wallet returns 401 without auth"""
        response = api_client.get(f"{BASE_URL}/nextapi/wallet")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("PASS: GET /nextapi/wallet returns 401 without auth")
    
    def test_unlock_without_auth(self, api_client):
        """POST /nextapi/unlock returns 401 without auth"""
        response = api_client.post(f"{BASE_URL}/nextapi/unlock", json={
            "candidateId": "test-candidate-id"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("PASS: POST /nextapi/unlock returns 401 without auth")
    
    def test_payments_create_order_without_auth(self, api_client):
        """POST /nextapi/payments/create-order returns 401 without auth"""
        response = api_client.post(f"{BASE_URL}/nextapi/payments/create-order", json={
            "credits": 10
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("PASS: POST /nextapi/payments/create-order returns 401 without auth")
    
    def test_payments_verify_without_auth(self, api_client):
        """POST /nextapi/payments/verify returns 401 without auth"""
        response = api_client.post(f"{BASE_URL}/nextapi/payments/verify", json={
            "credits": 10,
            "mock": True
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("PASS: POST /nextapi/payments/verify returns 401 without auth")

# ───────────────────────────────────────────────
# 6. PROTECTED ROUTES WITH AUTH (should work)
# ───────────────────────────────────────────────

class TestProtectedRoutesWithAuth:
    """Protected routes work with valid auth"""
    
    @pytest.fixture(scope="class")
    def auth_token(self, api_client):
        """Get token from existing account"""
        response = api_client.post(f"{BASE_URL}/nextapi/auth/login", json={
            "phone": EXISTING_ACCOUNT["phone"],
            "password": EXISTING_ACCOUNT["password"]
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["token"]
    
    def test_wallet_with_auth(self, api_client, auth_token):
        """GET /nextapi/wallet works with auth"""
        response = api_client.get(f"{BASE_URL}/nextapi/wallet", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "balance" in data
        assert "unlockedCandidates" in data
        print(f"PASS: GET /nextapi/wallet with auth - balance: {data['balance']}")
    
    def test_payments_create_order_with_auth(self, api_client, auth_token):
        """POST /nextapi/payments/create-order works with auth"""
        response = api_client.post(f"{BASE_URL}/nextapi/payments/create-order", 
            json={"credits": 10},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "order" in data
        assert data.get("mock") == True  # Using placeholder keys
        print(f"PASS: Create order with auth - order: {data['order']['id']}, mock: {data['mock']}")
    
    def test_payments_verify_with_auth(self, api_client, auth_token):
        """POST /nextapi/payments/verify works with auth (mock mode)"""
        response = api_client.post(f"{BASE_URL}/nextapi/payments/verify", 
            json={"credits": 10, "mock": True},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "new_balance" in data
        print(f"PASS: Verify payment (mock) with auth - new_balance: {data['new_balance']}")

# ───────────────────────────────────────────────
# 7. E2E FLOW: Signup -> Buy Credits -> Unlock
# ───────────────────────────────────────────────

class TestE2EAuthFlow:
    """End-to-end flow with auth"""
    
    def test_e2e_signup_buy_credits_unlock(self, api_client):
        """Complete flow: Signup -> Verify OTP -> Buy Credits -> Unlock candidate"""
        unique_phone = f"9{int(time.time())%100000}7777"
        company_name = f"E2ETest_{unique_phone}"
        
        # Step 1: Signup
        print(f"\n=== E2E Test: Signup with phone {unique_phone} ===")
        signup_res = api_client.post(f"{BASE_URL}/nextapi/auth/signup", json={
            "phone": unique_phone,
            "company_name": company_name,
            "password": "e2etest123"
        })
        assert signup_res.status_code == 200, f"Signup failed: {signup_res.text}"
        clean_phone = signup_res.json().get("phone")
        print(f"Step 1 PASS: Signup success, phone normalized to {clean_phone}")
        
        # Step 2: Verify OTP
        verify_res = api_client.post(f"{BASE_URL}/nextapi/auth/verify-otp", json={
            "phone": clean_phone,
            "otp": MOCK_OTP
        })
        assert verify_res.status_code == 200, f"OTP verify failed: {verify_res.text}"
        token = verify_res.json()["token"]
        employer = verify_res.json()["employer"]
        print(f"Step 2 PASS: OTP verified, employer_id: {employer['id']}")
        
        # Step 3: Check initial wallet (should be 0)
        headers = {"Authorization": f"Bearer {token}"}
        wallet_res = api_client.get(f"{BASE_URL}/nextapi/wallet", headers=headers)
        assert wallet_res.status_code == 200, f"Wallet fetch failed: {wallet_res.text}"
        initial_balance = wallet_res.json()["balance"]
        assert initial_balance == 0, f"New account should have 0 credits, got {initial_balance}"
        print(f"Step 3 PASS: Initial balance is 0")
        
        # Step 4: Buy credits (mock mode)
        order_res = api_client.post(f"{BASE_URL}/nextapi/payments/create-order",
            json={"credits": 10},
            headers=headers
        )
        assert order_res.status_code == 200
        assert order_res.json().get("mock") == True
        
        verify_payment_res = api_client.post(f"{BASE_URL}/nextapi/payments/verify",
            json={"credits": 10, "mock": True},
            headers=headers
        )
        assert verify_payment_res.status_code == 200
        new_balance = verify_payment_res.json()["new_balance"]
        assert new_balance == 10, f"Expected 10 credits after purchase, got {new_balance}"
        print(f"Step 4 PASS: Bought 10 credits, balance: {new_balance}")
        
        # Step 5: Get a candidate to unlock
        candidates_res = api_client.get(f"{BASE_URL}/nextapi/candidates")
        assert candidates_res.status_code == 200
        candidates = candidates_res.json().get("candidates", [])
        assert len(candidates) > 0, "No candidates found to unlock"
        candidate_id = candidates[0]["_id"]
        print(f"Step 5 PASS: Found candidate to unlock: {candidate_id}")
        
        # Step 6: Unlock candidate
        unlock_res = api_client.post(f"{BASE_URL}/nextapi/unlock",
            json={"candidateId": candidate_id},
            headers=headers
        )
        assert unlock_res.status_code == 200, f"Unlock failed: {unlock_res.text}"
        unlock_data = unlock_res.json()
        assert unlock_data.get("success") == True
        assert unlock_data.get("newBalance") == 9, f"Expected 9 credits after unlock, got {unlock_data.get('newBalance')}"
        assert "phone" in unlock_data, "Phone not returned on unlock"
        print(f"Step 6 PASS: Unlocked candidate, balance: {unlock_data['newBalance']}, phone: {unlock_data['phone']}")
        
        # Step 7: Verify wallet shows updated unlocked list
        wallet_res = api_client.get(f"{BASE_URL}/nextapi/wallet", headers=headers)
        wallet_data = wallet_res.json()
        assert candidate_id in wallet_data.get("unlockedCandidates", []), "Candidate not in unlocked list"
        print(f"Step 7 PASS: Candidate in unlocked list")
        
        print("=== E2E FLOW COMPLETE ===\n")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
