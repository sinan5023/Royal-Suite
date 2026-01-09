const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");
const Invoice = require("../models/invoiceModel");
const Booking = require("../models/bookingModel");

class InvoicePdfService {
  /**
   * Generate invoice PDF buffer matching Continental template
   */
  async generateInvoicePDF(invoiceId) {
    try {
      console.log("🔍 Fetching invoice data for ID:", invoiceId);

      const invoice = await Invoice.findById(invoiceId)
        .populate(
          "customerId",
          "fullName name email primaryMobile address city state pincode"
        )
        .populate(
          "bookingId",
          "bookingCode eventDate pickupDate expectedReturnDate"
        )
        .populate("items.productId", "displayName sku photos")
        .lean();

      if (!invoice) {
        throw new Error("Invoice not found");
      }

      console.log("✅ Invoice fetched:", invoice.invoiceNumber);

      const doc = new PDFDocument({
        size: "A4",
        margin: 40,
        bufferPages: true,
      });

      const chunks = [];

      return new Promise((resolve, reject) => {
        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => {
          console.log("✅ PDF Complete");
          resolve(Buffer.concat(chunks));
        });
        doc.on("error", (err) => {
          console.error("❌ PDF Error:", err);
          reject(err);
        });

        console.log("🎨 Generating PDF...");

        this._generateHeader(doc, invoice);
        this._generateInvoiceDetails(doc, invoice);
        this._generateCustomerDetails(doc, invoice);
        this._generateItemTable(doc, invoice);
        this._generateTotalsSection(doc, invoice);
        this._generateFooter(doc);

        doc.end();
      });
    } catch (error) {
      console.error("❌ PDF Service Error:", error.message);
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  }

  /**
   * Generate header with logo and summary box (matching Continental)
   */
  _generateHeader(doc, invoice) {
    // Logo and company details - LEFT SIDE
    const logoPath = path.join(
      __dirname,
      "../public/images/royal-suits-logo.png"
    );

    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 40, 40, { width: 230, height: 100 });
    }

    // Company name
    doc
      .fontSize(10)
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .text("royal suite", 40, 150);

    doc
      .fontSize(10)
      .fillColor("#666666")
      .font("Helvetica")
      .text("Koduvally", 40, 165)
      .text("Kerala", 40, 180)
      .text("India", 40, 195)
      .text("mohammedsinan5023@gmail.com", 40, 210);

    // RIGHT SIDE - Summary box (Continental style)
    const boxX = 380;
    const boxY = 40;
    const boxW = 175;

    // Box background
    doc
      .rect(boxX, boxY, boxW, 120)
      .fillAndStroke("#F8F9FA", "#E0E0E0")
      .lineWidth(1);

    // Sub Total
    doc
      .fontSize(9)
      .fillColor("#666666")
      .font("Helvetica")
      .text("Sub Total", boxX + 10, boxY + 15);
    doc.text(invoice.subtotal.toFixed(2), boxX + 10, boxY + 15, {
      width: boxW - 20,
      align: "right",
    });

    // Discount
    doc.text("Discount", boxX + 10, boxY + 35);
    doc.text((invoice.discountValue || 0).toFixed(2), boxX + 10, boxY + 35, {
      width: boxW - 20,
      align: "right",
    });

    // Total
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text("Total", boxX + 10, boxY + 57);
    doc.text(`Rs ${invoice.totalAmount.toFixed(2)}`, boxX + 10, boxY + 57, {
      width: boxW - 20,
      align: "right",
    });

    // Payment Made
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#666666")
      .text("Payment Made", boxX + 10, boxY + 77);
    doc.text(`(-) ${invoice.amountPaid.toFixed(2)}`, boxX + 10, boxY + 77, {
      width: boxW - 20,
      align: "right",
    });

    // Balance Due - highlighted
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor("#D97706")
      .text("Balance Due", boxX + 10, boxY + 99);
    doc.text(`Rs ${invoice.balanceDue.toFixed(2)}`, boxX + 10, boxY + 99, {
      width: boxW - 20,
      align: "right",
    });
  }

  /**
   * Invoice details section (matching Continental)
   */
  _generateInvoiceDetails(doc, invoice) {
    const yPos = 190;

    // Left - TAX INVOICE
    doc
      .fontSize(18)
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .text("TAX INVOICE", 40, 230);

    // Right - Invoice info
    const rightX = 350;
    const labelCol = rightX;
    const valueCol = rightX + 100;

    doc.fontSize(10).fillColor("#817d7d").font("Helvetica");

    // Invoice #
    doc.text("Invoice#", labelCol, yPos);
    doc.fillColor("#000000").font("Helvetica-Bold");
    doc.text(invoice.invoiceNumber, valueCol, yPos);

    // Balance Due
    doc.fillColor("#817d7d").font("Helvetica");
    doc.text("Balance Due", labelCol, yPos + 18);
    doc.fillColor("#D97706").font("Helvetica-Bold");
    doc.text(`Rs ${invoice.balanceDue.toFixed(2)}`, valueCol, yPos + 18);

    // Invoice Date
    doc.fillColor("#817d7d").font("Helvetica");
    doc.text("Invoice Date :", labelCol, yPos + 38);
    doc.fillColor("#000000");
    doc.text(this._formatDate(invoice.issueDate), valueCol, yPos + 38);

    // Terms
    doc.fillColor("#817d7d");
    doc.text("Terms :", labelCol, yPos + 53);
    doc.fillColor("#000000");
    doc.text(invoice.paymentTerms, valueCol, yPos + 53);

    // Due Date
    doc.fillColor("#817d7d");
    doc.text("Due Date :", labelCol, yPos + 68);
    doc.fillColor("#000000");
    doc.text(this._formatDate(invoice.dueDate), valueCol, yPos + 68);

    // P.O. / Booking
    if (invoice.bookingId) {
      doc.fillColor("#817d7d");
      doc.text("P.O.# :", labelCol, yPos + 83);
      doc.fillColor("#000000");
      doc.text(invoice.bookingId.bookingCode, valueCol, yPos + 83);
    }

    // Horizontal line
    doc
      .moveTo(40, yPos + 115)
      .lineTo(555, yPos + 115)
      .strokeColor("#E0E0E0")
      .lineWidth(1)
      .stroke();
  }

  /**
   * Customer details - Bill To & Ship To (Continental style)
   */
  _generateCustomerDetails(doc, invoice) {
    const yPos = 320;
    const customer = invoice.customerId;
    const billTo = invoice.billTo;

    // Bill To - LEFT
    doc
      .fontSize(10)
      .fillColor("#817d7d")
      .font("Helvetica-Bold")
      .text("Bill To", 40, yPos);

    doc
      .fontSize(10)
      .fillColor("#000000")
      .text(billTo.name || customer?.fullName || "N/A", 40, yPos + 33);

    doc.fontSize(10).font("Helvetica").fillColor("#666666");
    if (billTo.street) doc.text(billTo.street, 40, yPos + 33, { width: 200 });
    if (billTo.city) doc.text(billTo.city, 40, yPos + 48);
    if (billTo.postalCode || billTo.state) {
      doc.text(
        `${billTo.postalCode || ""} ${billTo.state || ""}`,
        40,
        yPos + 63
      );
    }
    doc.text("India", 40, yPos + 78);
    if (billTo.phone) doc.text(billTo.phone, 40, yPos + 93);

    // Ship To - RIGHT
    doc
      .fontSize(10)
      .fillColor("#817d7d")
      .font("Helvetica-Bold")
      .text("Ship To", 310, yPos);

    doc.fontSize(10).font("Helvetica").fillColor("#666666");
    if (billTo.street) doc.text(billTo.street, 310, yPos + 18, { width: 200 });
    if (billTo.city) doc.text(billTo.city, 310, yPos + 33);
    if (billTo.postalCode || billTo.state) {
      doc.text(
        `${billTo.postalCode || ""} ${billTo.state || ""}`,
        310,
        yPos + 48
      );
    }
    doc.text("India", 310, yPos + 63);
  }

  /**
   * Item table (Continental style with alternating rows)
   */
  _generateItemTable(doc, invoice) {
    const tableTop = 435;
    const tableLeft = 40;
    const colWidths = { sno: 30, desc: 220, qty: 60, rate: 70, amount: 95 };
    const rowHeight = 45;

    // Header with dark background (#3c3d3a from CSS)
    doc.rect(tableLeft, tableTop, 515, 25).fillAndStroke("#3c3d3a", "#3c3d3a");

    doc.fontSize(10).font("Helvetica-Bold").fillColor("#FFFFFF");

    let xPos = tableLeft + 8;
    doc.text("#", xPos, tableTop + 8, {
      width: colWidths.sno,
      align: "center",
    });
    xPos += colWidths.sno;
    doc.text("Item & Description", xPos, tableTop + 8, {
      width: colWidths.desc,
    });
    xPos += colWidths.desc;
    doc.text("Qty", xPos, tableTop + 8, {
      width: colWidths.qty,
      align: "right",
    });
    xPos += colWidths.qty;
    doc.text("Rate", xPos, tableTop + 8, {
      width: colWidths.rate,
      align: "right",
    });
    xPos += colWidths.rate;
    doc.text("Amount", xPos, tableTop + 8, {
      width: colWidths.amount,
      align: "right",
    });

    // Table rows
    let yPos = tableTop + 25;
    invoice.items.forEach((item, index) => {
      // Alternate row background
      if (index % 2 === 0) {
        doc.rect(tableLeft, yPos, 515, rowHeight).fill("#FFFFFF");
      }

      doc.fillColor("#000000");
      xPos = tableLeft + 8;

      // Serial number
      doc.fontSize(9).font("Helvetica");
      doc.text((index + 1).toString(), xPos, yPos + 8, {
        width: colWidths.sno,
        align: "center",
      });

      // Item name and description
      xPos += colWidths.sno;
      doc.fontSize(10).font("Helvetica-Bold");
      doc.text(item.productName || "N/A", xPos, yPos + 8, {
        width: colWidths.desc,
      });
      doc.fontSize(8).font("Helvetica").fillColor("#727272");
      doc.text(item.description || "Rental Item", xPos, yPos + 22, {
        width: colWidths.desc,
      });

      // Quantity
      xPos += colWidths.desc;
      doc.fontSize(9).fillColor("#000000");
      doc.text(`${item.quantity.toFixed(2)}\nNos`, xPos, yPos + 8, {
        width: colWidths.qty,
        align: "right",
      });

      // Rate
      xPos += colWidths.qty;
      doc.text((item.rentalPrice || 0).toFixed(2), xPos, yPos + 8, {
        width: colWidths.rate,
        align: "right",
      });

      // Amount
      xPos += colWidths.rate;
      const itemAmount =
        item.subtotal ||
        item.rentalPrice * item.quantity * (item.rentalDays || 1);
      doc.text(itemAmount.toFixed(2), xPos, yPos + 8, {
        width: colWidths.amount,
        align: "right",
      });

      // Bottom border for each row
      doc
        .moveTo(tableLeft, yPos + rowHeight)
        .lineTo(tableLeft + 515, yPos + rowHeight)
        .strokeColor("#E3E3E3")
        .lineWidth(1)
        .stroke();

      yPos += rowHeight;
    });

    doc.y = yPos + 15;
  }

  /**
   * Totals section (Continental style)
   */
  _generateTotalsSection(doc, invoice) {
    const yPos = doc.y + 10;

    // Total in words - LEFT
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor("#817d7d")
      .text("Total In Words:", 40, yPos);

    doc
      .fontSize(10)
      .font("Helvetica")
      .text(this._numberToWords(invoice.totalAmount), 40, yPos + 15, {
        width: 250,
      });

    // Totals - RIGHT
    const labelX = 350;
    const valueX = 480;
    let totalsY = yPos;

    doc.fontSize(9).fillColor("#666666").font("Helvetica");

    // Sub Total
    doc.text("Sub Total", labelX, totalsY);
    doc.text(invoice.subtotal.toFixed(2), valueX, totalsY, {
      align: "right",
      width: 75,
    });

    totalsY += 18;

    // Discount
    doc.text("Discount", labelX, totalsY);
    doc.text((invoice.discountValue || 0).toFixed(2), valueX, totalsY, {
      align: "right",
      width: 75,
    });

    totalsY += 20;

    // Line
    doc
      .moveTo(labelX, totalsY)
      .lineTo(555, totalsY)
      .strokeColor("#E0E0E0")
      .lineWidth(1)
      .stroke();

    totalsY += 10;

    // Total
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#000000");
    doc.text("Total", labelX, totalsY);
    doc.text(`Rs ${invoice.totalAmount.toFixed(2)}`, valueX, totalsY, {
      align: "right",
      width: 75,
    });

    totalsY += 20;

    // Payment Made
    doc.fontSize(9).font("Helvetica").fillColor("#666666");
    doc.text("Payment Made", labelX, totalsY);
    doc.fillColor("red");
    doc.text(`(-) ${invoice.amountPaid.toFixed(2)}`, valueX, totalsY, {
      align: "right",
      width: 75,
    });

    totalsY += 22;

    // Line
    doc
      .moveTo(labelX, totalsY)
      .lineTo(555, totalsY)
      .strokeColor("#E0E0E0")
      .lineWidth(1)
      .stroke();

    totalsY += 10;

    // Balance Due - highlighted
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#000000");
    doc.text("Balance Due", labelX, totalsY);
    doc.text(`Rs ${invoice.balanceDue.toFixed(2)}`, valueX, totalsY, {
      align: "right",
      width: 75,
    });
  }

  /**
   * Footer (Continental style)
   */
  _generateFooter(doc) {
    const footerY = 700;

    // Notes
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor("#817d7d")
      .text("Notes", 40, footerY);

    doc
      .fontSize(8)
      .font("Helvetica")
      .text("Thanks for your business.", 40, footerY + 15);

    // Terms & Conditions
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("Terms & Conditions", 40, footerY + 40);

    doc
      .fontSize(8)
      .font("Helvetica")
      .text(
        "This is a computer-generated invoice. This document is a valid piece of information and does not require any signature or stamp.",
        40,
        footerY + 55,
        { width: 400 }
      );
  }

  /**
   * Format date helper
   */
  _formatDate(date) {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  /**
   * Number to words conversion
   */
  _numberToWords(num) {
    let rupees = Math.floor(num);
    const paise = Math.round((num - rupees) * 100);

    const ones = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
    ];
    const tens = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];
    const teens = [
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ];

    const convertLessThanThousand = (n) => {
      if (n === 0) return "";
      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      if (n < 100)
        return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
      return (
        ones[Math.floor(n / 100)] +
        " Hundred" +
        (n % 100 ? " " + convertLessThanThousand(n % 100) : "")
      );
    };

    if (rupees === 0) return "Zero Rupees";

    let result = "Indian Rupee ";

    if (rupees >= 10000000) {
      result +=
        convertLessThanThousand(Math.floor(rupees / 10000000)) + " Crore ";
      rupees %= 10000000;
    }
    if (rupees >= 100000) {
      result += convertLessThanThousand(Math.floor(rupees / 100000)) + " Lakh ";
      rupees %= 100000;
    }
    if (rupees >= 1000) {
      result +=
        convertLessThanThousand(Math.floor(rupees / 1000)) + " Thousand ";
      rupees %= 1000;
    }
    if (rupees > 0) {
      result += convertLessThanThousand(rupees);
    }

    if (paise > 0) {
      result += " and " + convertLessThanThousand(paise) + " Paise";
    }

    return result.trim() + " Only";
  }
}

module.exports = new InvoicePdfService();
