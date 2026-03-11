// AI Service for Leave Classification and Risk Analysis

const classifyLeave = async (reason) => {
  try {
    const lowerReason = reason.toLowerCase();
    
    if (lowerReason.includes('sick') || lowerReason.includes('fever') || 
        lowerReason.includes('cold') || lowerReason.includes('flu') ||
        lowerReason.includes('hospital') || lowerReason.includes('doctor')) {
      return 'Sick';
    }
    
    if (lowerReason.includes('emergency') || lowerReason.includes('urgent') ||
        lowerReason.includes('accident')) {
      return 'Emergency';
    }
    
    if (lowerReason.includes('casual') || lowerReason.includes('personal') ||
        lowerReason.includes('family') || lowerReason.includes('function')) {
      return 'Casual';
    }
    
    return 'Other';
  } catch (error) {
    console.error('AI Classification Error:', error);
    return 'Other';
  }
};

const getApprovalRisk = async (data) => {
  try {
    const { leaveCount, days, teamLoad, balance } = data;
    
    let riskScore = 0;
    
    if (leaveCount > 5) riskScore += 30;
    else if (leaveCount > 3) riskScore += 20;
    else if (leaveCount > 1) riskScore += 10;
    
    if (days > 10) riskScore += 30;
    else if (days > 5) riskScore += 20;
    else if (days > 3) riskScore += 10;
    
    if (teamLoad > 3) riskScore += 30;
    else if (teamLoad > 2) riskScore += 20;
    else if (teamLoad > 1) riskScore += 10;
    
    if (balance < 2) riskScore += 30;
    else if (balance < 4) riskScore += 20;
    else if (balance < 6) riskScore += 10;
    
    if (riskScore >= 70) return 'High';
    if (riskScore >= 40) return 'Medium';
    return 'Low';
    
  } catch (error) {
    console.error('AI Risk Error:', error);
    return 'Medium';
  }
};

module.exports = {
  classifyLeave,
  getApprovalRisk
};