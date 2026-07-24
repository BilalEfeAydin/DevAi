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