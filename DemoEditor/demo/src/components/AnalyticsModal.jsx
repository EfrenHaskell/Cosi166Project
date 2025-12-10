import React from "react";
import Analytic_PIChart from "./Analytic_PIChart";

const AnalyticsModal = ({ onClose }) => {
  return (
    <div className="AnalyticsModal">
      <div className="AnalyticsModal-header">
        <h2 className="AnalyticsModal-title">Analytics Data</h2>
        <button className="AnalyticsModal-closeButton" onClick={onClose}>
          X
        </button>
      </div>

      <div className="AnalyticsModal-content">
        <div style={{ display: "flex", justifyContent: "center", marginTop: 30 }}>
          <Analytic_PIChart />
        </div>
      </div>
    </div>
  );
};

export default AnalyticsModal;
