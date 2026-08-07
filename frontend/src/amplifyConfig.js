import { Amplify } from 'aws-amplify';
console.log('amplifyConfig chargé ✅');
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_miUx3W5Cq',
      userPoolClientId: 'kvq8aeovmcat8uoncb9odset6',
    }
  }
});

// API Gateway endpoint deployed by CDK (DevAiStack.ApiUrl)
export const API_BASE_URL = 'https://lfass4s0ll.execute-api.us-east-1.amazonaws.com';