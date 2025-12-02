import React from 'react'

function AddclassModal({onClose}) {
  return (
    <div className="Addclass-Modal">
      <div className="classModal-header">
        <h2 className="classModal-title">Class Sessions</h2>
        <button className="classModal-closeButton" onClick={onClose}>X</button>
      </div>
{/* 
      <div className="classModal-content">
        <p className="classModal-description">
          Classroom 
        </p>
        <ul className="classModal-list">
          <li>Active students: 12</li>
          <li>Questions asked: 5</li>
          <li>Average response time: 1m 24s</li>
        </ul>
      </div> */}
    </div>
  )
}

export default AddclassModal
