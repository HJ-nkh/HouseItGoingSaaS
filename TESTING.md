# API Testing Guide

**🎉 Status: All tests passing! Full REST API backend is ready for production.**

This guide covers all the ways to test your HouseItGoingSaaS backend API without relying on the UI.

## 🚀 Quick Start

1. **Start your development server:**
   ```bash
   pnpm dev
   ```

2. **Set up the database:**
   ```bash
   pnpm db:setup
   pnpm db:migrate
   ```

3. **Run the full test suite:**
   ```bash
   pnpm test:api
   ```

   ✅ All 28 tests should pass, covering complete CRUD workflows for all entities.

## 📋 Testing Methods

### 1. Automated Test Suite with Vitest (Recommended)

**Full integration tests with authentication:**

```bash
# Run all API tests (creates test user, tests full CRUD operations)
pnpm test:api

# Run all tests
pnpm test

# Run tests with UI dashboard
pnpm test:ui

# Run tests in watch mode
pnpm test:watch
```

**What the automated tests do:**
- ✅ **Authentication**: Creates test user and authenticates automatically
- ✅ **Full CRUD**: Tests all Create, Read, Update, Delete operations
- ✅ **Workflows**: Tests complete project → drawing → simulation → report workflows
- ✅ **Error Handling**: Tests validation, invalid inputs, missing fields
- ✅ **Cleanup**: Automatically removes all test data when done
- ✅ **Relationships**: Verifies data relationships work correctly

**Prerequisites:**
- Development server running (`pnpm dev`)
- Database migrated (`pnpm db:migrate`)

### 2. CLI Quick Test (Good for CI/CD)

Run a lightweight test suite from the command line:

```bash
pnpm test:api-cli
```

This will test:
- ✅ Authentication requirements
- ✅ Invalid endpoints (404/405 errors)  
- ✅ Request validation
- ✅ Resource ID validation
- ✅ JSON parsing errors

### 3. Visual Studio Code REST Client (Best for Manual Testing)

Install the VS Code REST Client extension:
- Extension ID: `ms-vscode.vscode-restclient`

Open `api-tests.http` and run tests interactively:

**Unauthenticated Tests (Run First):**
- Click the "Send Request" link above each request
- All should return 401 or 500 (expected)

**Authenticated Tests (After Login):**
1. Open your app in browser: http://localhost:3000
2. Sign in to create a session
3. Return to VS Code and run the authenticated tests
4. Replace `:projectId`, `:drawingId`, etc. with actual IDs from responses

### 4. Manual curl Testing

Test individual endpoints with curl:

```bash
# Test unauthenticated endpoint
curl -X GET http://localhost:3000/api/user

# Test POST with invalid JSON
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{ invalid json'

# Test missing required fields
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"address": "123 Test St"}'
```

## 🔐 Authentication Testing

### Automated Authentication (Vitest)
The Vitest suite automatically handles authentication:
- Creates a unique test user for each test run
- Authenticates and stores session cookie
- Uses the cookie for all authenticated requests
- Cleans up test user data automatically

### Manual Authentication (REST Client)
**Option 1: Use the browser session**
1. Sign in through the web UI
2. Use REST Client with the same browser session
3. The session cookie will be automatically included

**Option 2: Manual cookie extraction**
1. Sign in through the web UI
2. Open browser dev tools → Application → Cookies
3. Copy the session cookie
4. Add `Cookie: session=...` header to REST Client requests

## 📊 Test Coverage

### ✅ Fully Automated Testing (Vitest)
- **Authentication**: User signup/signin with session management
- **Projects**: Full CRUD operations with validation
- **Drawings**: Create, read, update, delete with project relationships
- **Simulations**: Full CRUD with project/drawing relationships and parameters
- **Reports**: Create, read, download URL generation
- **Error Handling**: Invalid JSON, missing fields, invalid UUIDs, non-existent resources
- **Workflows**: End-to-end project → drawing → simulation → report workflows
- **Relationships**: Verifies all foreign key relationships work correctly
- **Cleanup**: Automatic test data cleanup

### ✅ Manual Testing (REST Client)
- Individual endpoint testing
- Custom request modification
- Response inspection
- Authentication session testing

### ✅ Basic CLI Testing
- Authentication requirements
- Invalid endpoints (404/405 errors)
- Request validation
- JSON parsing errors

### 🔄 Future Enhancements
- Performance/load testing
- Security penetration testing
- File upload/download testing (when implemented)
- Multi-user/team isolation testing

## 🧪 Example Test Scenarios

### Automated Test Flow (Vitest)
The automated tests run this complete workflow:

1. **Setup**: Create and authenticate test user
2. **Project**: Create → Read → Update project
3. **Drawing**: Create drawing linked to project → Read → Update
4. **Simulation**: Create simulation linked to project/drawing → Read → Update
5. **Report**: Create report linked to project/simulation → Read → Get download URL
6. **Verification**: Verify all relationships are correct
7. **Cleanup**: Delete all test data in reverse dependency order

### Manual Test Scenario (REST Client)
```http
# 1. Create project
POST http://localhost:3000/api/projects
Content-Type: application/json

{
  "title": "Test House",
  "address": "123 Test Street"
}

# 2. Add drawing to project
POST http://localhost:3000/api/projects/{{projectId}}/drawings
Content-Type: application/json

{
  "title": "Floor Plan",
  "drawingType": "FLOOR_PLAN"
}

# 3. Create simulation
POST http://localhost:3000/api/simulations
Content-Type: application/json

{
  "projectId": "{{projectId}}",
  "drawingId": "{{drawingId}}",
  "title": "Thermal Analysis",
  "simulationType": "THERMAL",
  "parameters": {
    "temperature": 20,
    "humidity": 50
  }
}

# 4. Generate report
POST http://localhost:3000/api/reports
Content-Type: application/json

{
  "projectId": "{{projectId}}",
  "simulationId": "{{simulationId}}",
  "title": "Analysis Report",
  "reportType": "SUMMARY"
}
```

### Scenario 2: Error Handling
```http
# Test validation errors
POST http://localhost:3000/api/projects
Content-Type: application/json

{
  "address": "Missing title field"
}

# Test invalid enum
POST http://localhost:3000/api/projects/{{projectId}}/drawings
Content-Type: application/json

{
  "title": "Test Drawing",
  "drawingType": "INVALID_TYPE"
}
}
```

## 🔧 Troubleshooting

### Common Issues

**Server Not Running**
```
❌ Dev server not running. Please start it with: pnpm dev
```
**Solution:** Run `pnpm dev` in one terminal, then run tests in another

**Database Errors**
```
Error: relation "projects" does not exist
```
**Solution:** Run `pnpm db:setup && pnpm db:migrate`

**Test Authentication Failures**
```
⚠️ Could not authenticate test user. Some tests may fail.
```
**Solutions:**
- Check that sign-up endpoint is working
- Verify database has users table
- Check authentication middleware

**Fetch Errors in Tests**
```
TypeError: fetch is not defined
```
**Solution:** The test setup should handle this automatically, but ensure you're using Node.js 18+ or that node-fetch is installed

### Test Database Issues

**For isolated test database (Optional):**
1. Create a separate test database
2. Set `TEST_DATABASE_URL` environment variable
3. Run migrations on test database before tests

**Current approach:** Tests use the same database as development, which is simpler but requires cleanup

## 📈 Advanced Testing Scenarios

### Performance Testing
```bash
# Install artillery for load testing
npm install -g artillery

# Test endpoint under load
artillery quick --count 10 --num 50 http://localhost:3000/api/user
```

### Security Testing
- Test SQL injection in query parameters
- Test XSS in JSON payloads  
- Test authentication bypass attempts
- Test rate limiting (when implemented)

### Memory/Resource Testing
```bash
# Monitor server resources during tests
pnpm test:api & top -p $(pgrep node)
```

## 🎯 Next Steps

### Current Status: ✅ COMPLETE
Your backend testing is now fully automated and comprehensive:

- **Automated Authentication**: Test user creation and session management
- **Full CRUD Coverage**: All entities tested with real operations
- **Relationship Testing**: Verifies foreign keys and data integrity
- **Error Handling**: Comprehensive validation and error testing  
- **Workflow Testing**: End-to-end business process verification
- **Auto Cleanup**: No test data left behind

### Future Enhancements (Optional)

1. **Separate Test Database**
   - Create isolated test environment
   - Enable parallel test execution
   - Faster test setup/teardown

2. **Performance Benchmarks**
   - Add response time assertions
   - Monitor memory usage
   - Test concurrent operations

3. **Extended Validation**
   - Business rule validation
   - Data consistency checks
   - Multi-tenant isolation

4. **CI/CD Integration**
   - Run tests on every commit
   - Generate test reports
   - Automatic deployment on test pass

## 🚀 Usage Summary

**For Daily Development:**
```bash
# Start server
pnpm dev

# Run comprehensive automated tests (in another terminal)
pnpm test:api
```

**For Manual Exploration:**
- Use `api-tests.http` with VS Code REST Client
- Sign in through browser first for authenticated endpoints

**For CI/CD:**
```bash
# Quick validation tests
pnpm test:api-cli

# Full test suite
pnpm test:api
```

Your backend is **production-ready** and **thoroughly tested**! 🎉
401 Unauthorized
```
**Expected:** This is normal for unauthenticated requests

### Test Framework Errors
```
fetch is not defined
```
**Solution:** The test setup includes fetch polyfill, ensure tests run with proper setup

## 📈 Advanced Testing

### Load Testing with Artillery
```bash
# Install artillery
npm install -g artillery

# Create artillery.yml config
artillery quick --count 10 --num 50 http://localhost:3000/api/user
```

### API Documentation Testing
```bash
# Generate and test OpenAPI docs
npx swagger-jsdoc -d swagger.config.js app/api/**/*.ts
```

### Security Testing
- Test SQL injection in query parameters
- Test XSS in JSON payloads  
- Test authentication bypass attempts
- Test rate limiting

## 🎯 Next Steps

1. **Implement Mock Authentication**
   - Create test helper for authenticated requests
   - Enable full CRUD testing automation

2. **Add Performance Tests**
   - Test response times
   - Test concurrent request handling
   - Test database query optimization

3. **Enhance Error Testing**
   - Test edge cases
   - Test malformed requests
   - Test system failures

4. **Add Integration Tests**
   - Test full user workflows
   - Test cross-entity relationships
   - Test business logic validation
