export const handler = async (event) => {
  const claims = event.requestContext.authorizer.jwt.claims;
  const groups = claims["cognito:groups"] || "no-group";

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: `Hello! You are in group: ${groups}`,
    }),
  };
};