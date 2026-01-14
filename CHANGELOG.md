# ClauseBuddy Changelog

## Version 1.0.5 - Stability and Reliability Improvements

### Extension Enhancements
- **Loading State Management**: Implemented proper loading states to prevent UI freezing during long-running API requests
- **API Retry Logic**: Added exponential backoff retry mechanism (3 attempts with 1s, 2s, 4s delays) for failed API requests
- **Enhanced Content Extraction**: 
  - Added MutationObserver to handle dynamically loaded content on modern websites
  - Implemented Shadow DOM support for comprehensive text extraction
  - Added debouncing to optimize performance
  - Improved visibility detection for better content filtering
- **Improved Error Handling**:
  - Differentiated error types (network failures, backend errors, validation errors)
  - User-friendly error messages with specific guidance
  - Proper error recovery and state management
- **Complete Chat Functionality**: Fully implemented chat interface with loading indicators and error handling

### Backend Improvements
- **Request Validation**: Added Pydantic models for input validation
  - Empty text validation
  - Maximum text length validation (50,000 characters)
- **Retry Mechanism**: Implemented request retry logic with backoff for Gemini API calls
  - 3 retry attempts
  - Status-based retry (500, 502, 503, 504)
  - Exponential backoff strategy
- **Timeout Configuration**: Increased API timeout to 90 seconds for better reliability
- **Enhanced Error Handling**:
  - Specific HTTP status codes for different error types
  - User-friendly error messages without exposing internal details
  - Proper handling of timeout, connection, and JSON parsing errors
- **JSON Response Cleaning**: Automatically removes markdown code blocks from AI responses

### Frontend Updates
- **Version Display**: Updated to version 1.0.5
- **Download Feedback**: Added visual feedback for download actions
  - Success message display
  - Error handling for failed downloads
  - Auto-hiding status messages

### Manifest Updates
- Version bumped to 1.0.5
- Added host permissions for `*.onrender.com` (backend API domain)

### Dependencies
- Added `pydantic` to backend requirements for request validation

## Testing Recommendations
1. Test extension on websites with dynamic content (SPAs, Shadow DOM)
2. Verify retry logic by simulating network interruptions
3. Test with large legal documents (approaching 50k character limit)
4. Validate chat functionality with various questions
5. Test error scenarios (no internet, backend down, invalid input)
