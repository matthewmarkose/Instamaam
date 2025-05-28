import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import InstagramSearch from './components/InstagramSearch';

function App() {
  return (
    <Router basename="/Instamaam">
      <div className="App">
        <Routes>
          <Route path="/" element={<InstagramSearch initialSearch={false} />} />
          <Route path="/:username" element={<InstagramSearch initialSearch={true} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
