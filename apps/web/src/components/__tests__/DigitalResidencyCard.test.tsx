import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DigitalResidencyCard from '../DigitalResidencyCard';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Mock html2canvas
jest.mock('html2canvas');

// Mock jsPDF
jest.mock('jspdf', () => {
  return jest.fn().mockImplementation(() => ({
    addImage: jest.fn(),
    save: jest.fn(),
  }));
});

describe('DigitalResidencyCard Component', () => {
  const mockApplication = {
    referenceNumber: 'KRG-2025-000001',
    fullName: 'Ahmad Hassan',
    motherFullName: 'Fatima Ali',
    nationality: 'Iraq',
    nationalId: '123456789',
    dateOfBirth: '1990-01-15',
    visitPurpose: 'Business',
    visitStartDate: '2025-02-01',
    visitEndDate: '2025-02-15',
    approvalDate: '2025-01-20',
    destinationGovernorate: 'Erbil',
    qrCode: 'data:image/png;base64,mockQRCode',
    photoUrl: 'https://example.com/photo.jpg',
  };

  const mockApplicationWithoutOptionalFields = {
    referenceNumber: 'KRG-2025-000002',
    fullName: 'Sara Mohammed',
    nationality: 'Iraq',
    nationalId: '987654321',
    dateOfBirth: '1995-05-20',
    visitPurpose: 'Tourism',
    visitStartDate: '2025-03-01',
    visitEndDate: '2025-03-10',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the component correctly', () => {
      render(<DigitalResidencyCard application={mockApplication} />);

      expect(screen.getByText('Kurdistan Region')).toBeInTheDocument();
      expect(screen.getByText('Ministry of Interior')).toBeInTheDocument();
      expect(screen.getByText('Electronic Residency Permit')).toBeInTheDocument();
    });

    it('should display all applicant information', () => {
      render(<DigitalResidencyCard application={mockApplication} />);

      expect(screen.getByText('Ahmad Hassan')).toBeInTheDocument();
      expect(screen.getByText('Mother: Fatima Ali')).toBeInTheDocument();
      expect(screen.getByText('Iraq')).toBeInTheDocument();
      expect(screen.getByText('123456789')).toBeInTheDocument();
      expect(screen.getByText('Business')).toBeInTheDocument();
      expect(screen.getByText('Erbil')).toBeInTheDocument();
    });

    it('should display reference number', () => {
      render(<DigitalResidencyCard application={mockApplication} />);

      expect(screen.getByText('KRG-2025-000001')).toBeInTheDocument();
    });

    it('should display formatted dates', () => {
      render(<DigitalResidencyCard application={mockApplication} />);

      // Dates are formatted as '01 Feb 2025' format
      const validFrom = screen.getByText(/01 Feb 2025/i);
      const validUntil = screen.getByText(/15 Feb 2025/i);

      expect(validFrom).toBeInTheDocument();
      expect(validUntil).toBeInTheDocument();
    });

    it('should display approval date when available', () => {
      render(<DigitalResidencyCard application={mockApplication} />);

      const approvalText = screen.getByText(/Approved:/i);
      expect(approvalText).toBeInTheDocument();
    });

    it('should handle missing optional fields', () => {
      render(<DigitalResidencyCard application={mockApplicationWithoutOptionalFields} />);

      expect(screen.getByText('Sara Mohammed')).toBeInTheDocument();
      expect(screen.queryByText(/Mother:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Approved:/)).not.toBeInTheDocument();
    });
  });

  describe('QR Code Display', () => {
    it('should display QR code when available', () => {
      render(<DigitalResidencyCard application={mockApplication} />);

      const qrImage = screen.getByAltText('QR Code');
      expect(qrImage).toBeInTheDocument();
      expect(qrImage).toHaveAttribute('src', 'data:image/png;base64,mockQRCode');
    });

    it('should display placeholder when QR code is not available', () => {
      render(<DigitalResidencyCard application={mockApplicationWithoutOptionalFields} />);

      // Should show SVG placeholder instead of QR code
      const container = screen.getByText(/Kurdistan Region/i).closest('div');
      expect(container).toBeInTheDocument();
    });

    it('should handle QR code load error', () => {
      render(<DigitalResidencyCard application={mockApplication} />);

      const qrImage = screen.getByAltText('QR Code') as HTMLImageElement;
      
      // Simulate image load error
      fireEvent.error(qrImage);

      // Image should be hidden after error
      expect(qrImage.style.display).toBe('none');
    });
  });

  describe('Photo Display', () => {
    it('should display applicant photo when available', () => {
      render(<DigitalResidencyCard application={mockApplication} />);

      const photo = screen.getByAltText('Ahmad Hassan');
      expect(photo).toBeInTheDocument();
      expect(photo).toHaveAttribute('src', 'https://example.com/photo.jpg');
    });

    it('should display placeholder when photo is not available', () => {
      render(<DigitalResidencyCard application={mockApplicationWithoutOptionalFields} />);

      // Should not have an img with alt text matching the name
      expect(screen.queryByAltText('Sara Mohammed')).not.toBeInTheDocument();
    });
  });

  describe('Download Functionality', () => {
    it('should have download as image button', () => {
      render(<DigitalResidencyCard application={mockApplication} />);

      const downloadImageBtn = screen.getByText('Download as Image');
      expect(downloadImageBtn).toBeInTheDocument();
    });

    it('should have download as PDF button', () => {
      render(<DigitalResidencyCard application={mockApplication} />);

      const downloadPDFBtn = screen.getByText('Download as PDF');
      expect(downloadPDFBtn).toBeInTheDocument();
    });

    it('should download card as image when button is clicked', async () => {
      const mockCanvas = {
        toDataURL: jest.fn().mockReturnValue('data:image/png;base64,mockImage'),
        height: 800,
        width: 600,
      };

      (html2canvas as jest.Mock).mockResolvedValue(mockCanvas);

      const mockLink = {
        click: jest.fn(),
        download: '',
        href: '',
      };

      jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);

      render(<DigitalResidencyCard application={mockApplication} />);

      const downloadImageBtn = screen.getByText('Download as Image');
      fireEvent.click(downloadImageBtn);

      await waitFor(() => {
        expect(html2canvas).toHaveBeenCalled();
        expect(mockLink.click).toHaveBeenCalled();
        expect(mockLink.download).toBe('KRG-Residency-Card-KRG-2025-000001.png');
      });
    });

    it('should download card as PDF when button is clicked', async () => {
      const mockCanvas = {
        toDataURL: jest.fn().mockReturnValue('data:image/png;base64,mockImage'),
        height: 800,
        width: 600,
      };

      (html2canvas as jest.Mock).mockResolvedValue(mockCanvas);

      const mockPDF = {
        addImage: jest.fn(),
        save: jest.fn(),
      };

      (jsPDF as jest.Mock).mockReturnValue(mockPDF);

      render(<DigitalResidencyCard application={mockApplication} />);

      const downloadPDFBtn = screen.getByText('Download as PDF');
      fireEvent.click(downloadPDFBtn);

      await waitFor(() => {
        expect(html2canvas).toHaveBeenCalled();
        expect(mockPDF.addImage).toHaveBeenCalled();
        expect(mockPDF.save).toHaveBeenCalledWith('KRG-Residency-Card-KRG-2025-000001.pdf');
      });
    });

    it('should handle image download error gracefully', async () => {
      (html2canvas as jest.Mock).mockRejectedValue(new Error('Canvas error'));

      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<DigitalResidencyCard application={mockApplication} />);

      const downloadImageBtn = screen.getByText('Download as Image');
      fireEvent.click(downloadImageBtn);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error generating image:', expect.any(Error));
        expect(alertSpy).toHaveBeenCalledWith('Failed to download card as image');
      });

      alertSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should handle PDF download error gracefully', async () => {
      (html2canvas as jest.Mock).mockRejectedValue(new Error('Canvas error'));

      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<DigitalResidencyCard application={mockApplication} />);

      const downloadPDFBtn = screen.getByText('Download as PDF');
      fireEvent.click(downloadPDFBtn);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error generating PDF:', expect.any(Error));
        expect(alertSpy).toHaveBeenCalledWith('Failed to download card as PDF');
      });

      alertSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Instructions Section', () => {
    it('should display usage instructions', () => {
      render(<DigitalResidencyCard application={mockApplication} />);

      expect(screen.getByText(/How to Use Your Digital Residency Card/i)).toBeInTheDocument();
      expect(screen.getByText(/Download and save this card to your device/i)).toBeInTheDocument();
      expect(screen.getByText(/Present it at checkpoints when requested/i)).toBeInTheDocument();
      expect(screen.getByText(/The QR code can be scanned to verify authenticity/i)).toBeInTheDocument();
    });
  });

  describe('Styling and Layout', () => {
    it('should apply gradient background to card', () => {
      const { container } = render(<DigitalResidencyCard application={mockApplication} />);

      const card = container.querySelector('.bg-gradient-to-br');
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('from-blue-600', 'via-blue-700', 'to-indigo-800');
    });

    it('should have proper minimum height', () => {
      const { container } = render(<DigitalResidencyCard application={mockApplication} />);

      const card = container.querySelector('[style*="minHeight"]');
      expect(card).toBeInTheDocument();
    });

    it('should display watermark text', () => {
      render(<DigitalResidencyCard application={mockApplication} />);

      expect(screen.getByText(/official electronic residency permit/i)).toBeInTheDocument();
      expect(screen.getByText(/Verify authenticity at: evisit.krg.gov/i)).toBeInTheDocument();
    });
  });

  describe('Date Formatting', () => {
    it('should format dates in GB locale', () => {
      render(<DigitalResidencyCard application={mockApplication} />);

      // Check for formatted date pattern (day month year)
      const dateElements = screen.getAllByText(/\d{2}\s\w{3}\s\d{4}/);
      expect(dateElements.length).toBeGreaterThan(0);
    });

    it('should handle date of birth formatting', () => {
      render(<DigitalResidencyCard application={mockApplication} />);

      // Date of birth should be formatted
      const dobText = screen.getByText(/15 Jan 1990/i);
      expect(dobText).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper alt text for images', () => {
      render(<DigitalResidencyCard application={mockApplication} />);

      const qrCode = screen.getByAltText('QR Code');
      const photo = screen.getByAltText('Ahmad Hassan');

      expect(qrCode).toBeInTheDocument();
      expect(photo).toBeInTheDocument();
    });

    it('should have clickable download buttons', () => {
      render(<DigitalResidencyCard application={mockApplication} />);

      const imageBtn = screen.getByText('Download as Image').closest('button');
      const pdfBtn = screen.getByText('Download as PDF').closest('button');

      expect(imageBtn).toBeEnabled();
      expect(pdfBtn).toBeEnabled();
    });
  });

  describe('Different Application States', () => {
    it('should render correctly for APPROVED status', () => {
      render(<DigitalResidencyCard application={mockApplication} />);

      expect(screen.getByText('KRG-2025-000001')).toBeInTheDocument();
      expect(screen.getByText(/Approved:/i)).toBeInTheDocument();
    });

    it('should handle applications without approval date', () => {
      const appWithoutApproval = {
        ...mockApplication,
        approvalDate: undefined,
      };

      render(<DigitalResidencyCard application={appWithoutApproval} />);

      expect(screen.queryByText(/Approved:/i)).not.toBeInTheDocument();
    });

    it('should handle different visit purposes', () => {
      const purposes = ['Business', 'Tourism', 'Medical', 'Education', 'Family Visit'];

      purposes.forEach((purpose) => {
        const { unmount } = render(
          <DigitalResidencyCard
            application={{
              ...mockApplication,
              visitPurpose: purpose,
            }}
          />
        );

        expect(screen.getByText(purpose)).toBeInTheDocument();
        unmount();
      });
    });

    it('should display N/A for missing destination', () => {
      const appWithoutDestination = {
        ...mockApplication,
        destinationGovernorate: undefined,
      };

      render(<DigitalResidencyCard application={appWithoutDestination} />);

      expect(screen.getByText('N/A')).toBeInTheDocument();
    });
  });

  describe('Component Props', () => {
    it('should accept all required props', () => {
      expect(() => {
        render(<DigitalResidencyCard application={mockApplication} />);
      }).not.toThrow();
    });

    it('should handle minimal props', () => {
      expect(() => {
        render(<DigitalResidencyCard application={mockApplicationWithoutOptionalFields} />);
      }).not.toThrow();
    });
  });
});

