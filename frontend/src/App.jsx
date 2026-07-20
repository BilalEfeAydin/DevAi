import Signup from './Signup';

function App() {
  return <Signup onSwitchToLogin={() => alert('Login pas encore construit')} />;
}

export default App;