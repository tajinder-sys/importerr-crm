/**
 * Standardized response handler for API responses
 */

const sendResponse = (res, statusCode, success, message, data = null) => {
  const response = {
    success,
    message,
    ...(data && { data })
  };
  
  return res.status(statusCode).json(response);
};

const sendSuccess = (res, message = 'Operation successful', data = null) => {
  return sendResponse(res, 200, true, message, data);
};

const sendCreated = (res, message = 'Resource created successfully', data = null) => {
  return sendResponse(res, 201, true, message, data);
};

const sendBadRequest = (res, message = 'Bad request', errors = null) => {
  return sendResponse(res, 400, false, message, errors);
};

const sendUnauthorized = (res, message = 'Unauthorized access') => {
  return sendResponse(res, 401, false, message);
};

const sendForbidden = (res, message = 'Forbidden access') => {
  return sendResponse(res, 403, false, message);
};

const sendNotFound = (res, message = 'Resource not found') => {
  return sendResponse(res, 404, false, message);
};

const sendServerError = (res, message = 'Internal server error') => {
  return sendResponse(res, 500, false, message);
};

module.exports = {
  sendResponse,
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
  sendServerError
};
