const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const User = require('../models/User');
const Leave = require('../models/Leave');
const Attendance = require('../models/Attendance');
const Document = require('../models/Document');
const PerformanceReview = require('../models/PerformanceReview');
const Department = require('../models/Department');

// ==================== EMPLOYEE REPORTS ====================

// @desc    Export Employee List (Excel)
// @route   GET /api/reports/employees/excel
// @access  Admin/Manager
const exportEmployeesExcel = async (req, res) => {
  try {
    const { department, status } = req.query;

    // Build filter
    const filter = {};
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;
    if (department) filter['employmentDetails.department'] = department;

    // If manager, only their team
    if (req.user.role === 'manager') {
      filter.team = req.user.team;
    }

    const employees = await User.find(filter)
      .populate('employmentDetails.department', 'name')
      .select('-password');

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Employees');

    // Add columns
    worksheet.columns = [
      { header: 'Employee ID', key: 'employeeId', width: 15 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Role', key: 'role', width: 15 },
      { header: 'Team', key: 'team', width: 15 },
      { header: 'Department', key: 'department', width: 20 },
      { header: 'Designation', key: 'designation', width: 20 },
      { header: 'Joining Date', key: 'joiningDate', width: 15 },
      { header: 'Status', key: 'status', width: 10 }
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F81BD' }
    };
    worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

    // Add data
    employees.forEach(emp => {
      worksheet.addRow({
        employeeId: emp.employeeId,
        name: emp.name,
        email: emp.email,
        role: emp.role,
        team: emp.team || '-',
        department: emp.employmentDetails?.department?.name || '-',
        designation: emp.employmentDetails?.designation || '-',
        joiningDate: emp.employmentDetails?.joiningDate?.toLocaleDateString() || '-',
        status: emp.isActive ? 'Active' : 'Inactive'
      });
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=employees.xlsx');

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Export employees error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Export Employee List (PDF)
// @route   GET /api/reports/employees/pdf
// @access  Admin/Manager
const exportEmployeesPDF = async (req, res) => {
  try {
    const { department, status } = req.query;

    const filter = {};
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;
    if (department) filter['employmentDetails.department'] = department;

    if (req.user.role === 'manager') {
      filter.team = req.user.team;
    }

    const employees = await User.find(filter)
      .populate('employmentDetails.department', 'name')
      .select('name email employeeId role team employmentDetails isActive');

    // Create PDF
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=employees.pdf');

    doc.pipe(res);

    // Title
    doc.fontSize(20).text('Employee Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' });
    doc.moveDown();

    // Table headers
    const tableTop = 150;
    const col1 = 50, col2 = 120, col3 = 220, col4 = 300, col5 = 350, col6 = 420;

    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('ID', col1, tableTop);
    doc.text('Name', col2, tableTop);
    doc.text('Email', col3, tableTop);
    doc.text('Role', col4, tableTop);
    doc.text('Team', col5, tableTop);
    doc.text('Status', col6, tableTop);

    // Draw line
    doc.moveTo(30, tableTop + 15)
       .lineTo(580, tableTop + 15)
       .stroke();

    // Table data
    let y = tableTop + 25;
    doc.font('Helvetica');

    employees.forEach((emp, index) => {
      if (y > 500) {
        doc.addPage();
        y = 50;
      }

      doc.text(emp.employeeId || '-', col1, y);
      doc.text(emp.name, col2, y);
      doc.text(emp.email, col3, y);
      doc.text(emp.role, col4, y);
      doc.text(emp.team || '-', col5, y);
      doc.text(emp.isActive ? 'Active' : 'Inactive', col6, y);

      y += 20;
    });

    doc.end();

  } catch (error) {
    console.error('Export employees PDF error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== LEAVE REPORTS ====================

// @desc    Export Leave Report (Excel)
// @route   GET /api/reports/leaves/excel
// @access  Admin/Manager
const exportLeavesExcel = async (req, res) => {
  try {
    const { fromDate, toDate, status, employeeId } = req.query;

    const filter = {};
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate);
      if (toDate) filter.createdAt.$lte = new Date(toDate);
    }
    if (status) filter.status = status;
    if (employeeId) filter.employee = employeeId;

    // If manager, only their team
    if (req.user.role === 'manager') {
      const teamMembers = await User.find({ team: req.user.team }).select('_id');
      filter.employee = { $in: teamMembers.map(m => m._id) };
    }

    const leaves = await Leave.find(filter)
      .populate('employee', 'name email employeeId team')
      .sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Leaves');

    worksheet.columns = [
      { header: 'Employee ID', key: 'employeeId', width: 15 },
      { header: 'Employee Name', key: 'name', width: 20 },
      { header: 'Leave Type', key: 'leaveType', width: 15 },
      { header: 'From Date', key: 'fromDate', width: 15 },
      { header: 'To Date', key: 'toDate', width: 15 },
      { header: 'Days', key: 'days', width: 10 },
      { header: 'Reason', key: 'reason', width: 30 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Applied On', key: 'appliedOn', width: 15 }
    ];

    // Style header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F81BD' }
    };

    leaves.forEach(leave => {
      const days = Math.ceil((new Date(leave.toDate) - new Date(leave.fromDate)) / (1000 * 60 * 60 * 24)) + 1;
      
      worksheet.addRow({
        employeeId: leave.employee?.employeeId || '-',
        name: leave.employee?.name || '-',
        leaveType: leave.leaveType,
        fromDate: new Date(leave.fromDate).toLocaleDateString(),
        toDate: new Date(leave.toDate).toLocaleDateString(),
        days: days,
        reason: leave.reason,
        status: leave.status,
        appliedOn: new Date(leave.createdAt).toLocaleDateString()
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=leaves.xlsx');

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Export leaves error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== ATTENDANCE REPORTS ====================

// @desc    Export Attendance Report (Excel)
// @route   GET /api/reports/attendance/excel
// @access  Admin/Manager
const exportAttendanceExcel = async (req, res) => {
  try {
    const { month, year } = req.query;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const attendance = await Attendance.find({
      date: { $gte: startDate, $lte: endDate }
    })
      .populate('employee', 'name email employeeId team')
      .sort({ date: -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance');

    worksheet.columns = [
      { header: 'Employee ID', key: 'employeeId', width: 15 },
      { header: 'Employee Name', key: 'name', width: 20 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Check In', key: 'checkIn', width: 15 },
      { header: 'Check Out', key: 'checkOut', width: 15 },
      { header: 'Work Hours', key: 'workHours', width: 12 },
      { header: 'Overtime', key: 'overtime', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Location', key: 'location', width: 12 }
    ];

    // Style header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F81BD' }
    };

    attendance.forEach(record => {
      worksheet.addRow({
        employeeId: record.employee?.employeeId || '-',
        name: record.employee?.name || '-',
        date: new Date(record.date).toLocaleDateString(),
        checkIn: record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : '-',
        checkOut: record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : '-',
        workHours: record.workHours?.toFixed(2) || 0,
        overtime: record.overtime?.toFixed(2) || 0,
        status: record.status,
        location: record.location || '-'
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance.xlsx');

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Export attendance error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== DOCUMENT REPORTS ====================

// @desc    Export Document Report (Excel)
// @route   GET /api/reports/documents/excel
// @access  Admin/Manager
const exportDocumentsExcel = async (req, res) => {
  try {
    const { verificationStatus, category } = req.query;

    const filter = { isActive: true };
    if (verificationStatus) filter.verificationStatus = verificationStatus;
    if (category) filter.category = category;

    const documents = await Document.find(filter)
      .populate('employee', 'name email employeeId team')
      .populate('verifiedBy', 'name email')
      .sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Documents');

    worksheet.columns = [
      { header: 'Employee ID', key: 'employeeId', width: 15 },
      { header: 'Employee Name', key: 'name', width: 20 },
      { header: 'Title', key: 'title', width: 25 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Type', key: 'documentType', width: 15 },
      { header: 'Document Number', key: 'documentNumber', width: 20 },
      { header: 'Issued By', key: 'issuedBy', width: 20 },
      { header: 'Expiry Date', key: 'expiryDate', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Verified By', key: 'verifiedBy', width: 20 }
    ];

    // Style header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F81BD' }
    };

    documents.forEach(doc => {
      worksheet.addRow({
        employeeId: doc.employee?.employeeId || '-',
        name: doc.employee?.name || '-',
        title: doc.title,
        category: doc.category,
        documentType: doc.documentType,
        documentNumber: doc.documentNumber || '-',
        issuedBy: doc.issuedBy || '-',
        expiryDate: doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString() : '-',
        status: doc.verificationStatus,
        verifiedBy: doc.verifiedBy?.name || '-'
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=documents.xlsx');

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Export documents error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== PERFORMANCE REPORTS ====================

// @desc    Export Performance Report (Excel)
// @route   GET /api/reports/performance/excel
// @access  Admin/Manager
const exportPerformanceExcel = async (req, res) => {
  try {
    const { year, quarter } = req.query;

    const filter = {};
    if (year) filter['period.year'] = parseInt(year);
    if (quarter) filter['period.quarter'] = parseInt(quarter);

    const reviews = await PerformanceReview.find(filter)
      .populate('employee', 'name email employeeId team')
      .populate('reviewer', 'name email')
      .sort({ 'period.year': -1, 'period.quarter': -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Performance Reviews');

    worksheet.columns = [
      { header: 'Employee ID', key: 'employeeId', width: 15 },
      { header: 'Employee Name', key: 'name', width: 20 },
      { header: 'Review Type', key: 'reviewType', width: 15 },
      { header: 'Year', key: 'year', width: 10 },
      { header: 'Quarter', key: 'quarter', width: 10 },
      { header: 'Overall Rating', key: 'overall', width: 15 },
      { header: 'Technical', key: 'technical', width: 12 },
      { header: 'Communication', key: 'communication', width: 15 },
      { header: 'Teamwork', key: 'teamwork', width: 12 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Reviewer', key: 'reviewer', width: 20 }
    ];

    // Style header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F81BD' }
    };

    reviews.forEach(review => {
      worksheet.addRow({
        employeeId: review.employee?.employeeId || '-',
        name: review.employee?.name || '-',
        reviewType: review.reviewType,
        year: review.period?.year || '-',
        quarter: review.period?.quarter || '-',
        overall: review.ratings?.overall || '-',
        technical: review.ratings?.technical || '-',
        communication: review.ratings?.communication || '-',
        teamwork: review.ratings?.teamwork || '-',
        status: review.status,
        reviewer: review.reviewer?.name || '-'
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=performance.xlsx');

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Export performance error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== SUMMARY REPORT ====================

// @desc    Export Complete Summary Report (Excel)
// @route   GET /api/reports/summary/excel
// @access  Admin only
const exportSummaryExcel = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();

    // Employee Summary Sheet
    const empSheet = workbook.addWorksheet('Employee Summary');
    const employees = await User.find({ isActive: true })
      .populate('employmentDetails.department', 'name');

    empSheet.columns = [
      { header: 'Total Employees', key: 'total', width: 20 },
      { header: 'Active', key: 'active', width: 15 },
      { header: 'By Role', key: 'byRole', width: 30 }
    ];

    const byRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    empSheet.addRow({
      total: employees.length,
      active: employees.filter(e => e.isActive).length,
      byRole: byRole.map(r => `${r._id}: ${r.count}`).join(', ')
    });

    // Leave Summary Sheet
    const leaveSheet = workbook.addWorksheet('Leave Summary');
    const leaves = await Leave.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    leaveSheet.columns = [
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Count', key: 'count', width: 10 }
    ];

    leaves.forEach(l => {
      leaveSheet.addRow({ status: l._id, count: l.count });
    });

    // Document Summary Sheet
    const docSheet = workbook.addWorksheet('Document Summary');
    const docs = await Document.aggregate([
      { $group: { _id: '$verificationStatus', count: { $sum: 1 } } }
    ]);

    docSheet.columns = [
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Count', key: 'count', width: 10 }
    ];

    docs.forEach(d => {
      docSheet.addRow({ status: d._id, count: d.count });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=summary-report.xlsx');

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Export summary error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  exportEmployeesExcel,
  exportEmployeesPDF,
  exportLeavesExcel,
  exportAttendanceExcel,
  exportDocumentsExcel,
  exportPerformanceExcel,
  exportSummaryExcel
};