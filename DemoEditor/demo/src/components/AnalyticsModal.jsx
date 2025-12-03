import React from "react";

const AnalyticsModal = ({onClose}) => {
  return (
    <div className="AnalyticsModal">
      <div className="AnalyticsModal-header">
        <h2 className="AnalyticsModal-title">Analytics Data</h2>
        <button className="AnalyticsModal-closeButton" onClick={onClose}>X</button>
      </div>

      <div className="AnalyticsModal-content">
        <p className="AnalyticsModal-description">
          Quick summary of classroom activity.
        </p>
        <ul className="AnalyticsModal-list">
          <li>Active students: 12</li>
          <li>Questions asked: 5</li>
          <li>Average response time: 1m 24s</li>
        </ul>
      </div>
    </div>
  );
};

export default AnalyticsModal;
