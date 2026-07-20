import { Amplify } from 'aws-amplify';
console.log('amplifyConfig chargé ✅');
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'eu-north-1_ZmyQp8oxR',
      userPoolClientId: 'an9970u6b5vs4ei549p6v322v',
    }
  }
});