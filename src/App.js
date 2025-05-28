import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import InstagramSearch from './components/InstagramSearch';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<InstagramSearch />} />
          <Route path="/:username" element={<InstagramSearch />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
