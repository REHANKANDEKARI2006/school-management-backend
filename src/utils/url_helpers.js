/**
 * Shared URL helper utilities.
 * Extracts the frontend origin URL from the incoming request headers.
 */

/**
 * Determine the frontend URL from the request's Origin or Referer header.
 * Falls back to null if neither is available.
 * @param {import('express').Request} req
 * @returns {string|null}
 */
export const getFrontendUrl = (req) => {
  if (req.headers.origin) return req.headers.origin;
  if (req.headers.referer) {
    try {
      return new URL(req.headers.referer).origin;
    } catch (e) {}
  }
  return null;
};
