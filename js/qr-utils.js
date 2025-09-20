/**
 * QR Code Utilities
 * Additional helper functions for QR code generation and management
 */

class QRCodeUtils {
    static templates = {
        restaurant: {
            name: 'Restaurant Menu',
            icon: '🍽️',
            data: 'https://restaurant.com/menu',
            description: 'Contactless menu access'
        },
        business: {
            name: 'Business Card',
            icon: '👤',
            data: `BEGIN:VCARD
VERSION:3.0
FN:John Smith
ORG:Your Company
TEL:+1-555-123-4567
EMAIL:john@yourcompany.com
URL:https://yourcompany.com
END:VCARD`,
            description: 'Contact information'
        },
        social: {
            name: 'Social Media',
            icon: '📱',
            data: 'https://instagram.com/yourusername',
            description: 'Social media profile'
        },
        event: {
            name: 'Event Info',
            icon: '📅',
            data: `BEGIN:VEVENT
VERSION:2.0
SUMMARY:Event Name
DTSTART:20250301T180000Z
DTEND:20250301T220000Z
LOCATION:Event Venue
DESCRIPTION:Event Description
END:VEVENT`,
            description: 'Calendar event'
        },
        wifi: {
            name: 'WiFi Access',
            icon: '📶',
            data: 'WIFI:T:WPA;S:NetworkName;P:password123;;',
            description: 'Network credentials'
        }
    };

    static applyTemplate(templateKey) {
        const template = this.templates[templateKey];
        if (template && window.qrGenerator) {
            window.qrGenerator.currentData = template.data;
            
            // Update URL input if visible
            const urlInput = document.querySelector('input[type="url"]');
            if (urlInput) {
                urlInput.value = template.data;
            }
            
            window.qrGenerator.generateQRCode();
        }
    }

    static validateQRData(data, type) {
        switch (type) {
            case 'url':
                try {
                    new URL(data);
                    return { valid: true };
                } catch {
                    return { valid: false, error: 'Invalid URL format' };
                }
            
            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(data) 
                    ? { valid: true }
                    : { valid: false, error: 'Invalid email format' };
            
            case 'phone':
                const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
                return phoneRegex.test(data.replace(/[\s\-\(\)]/g, ''))
                    ? { valid: true }
                    : { valid: false, error: 'Invalid phone number format' };
            
            default:
                return { valid: true };
        }
    }

    static estimateQRComplexity(data) {
        // Rough estimation of QR code complexity
        const length = data.length;
        
        if (length <= 25) return 'Simple';
        if (length <= 100) return 'Moderate';
        if (length <= 300) return 'Complex';
        return 'Very Complex';
    }

    static suggestOptimizations(data, currentConfig) {
        const suggestions = [];
        
        // Data length suggestions
        if (data.length > 500) {
            suggestions.push({
                type: 'warning',
                message: 'Long data may create complex QR codes. Consider using a URL shortener.'
            });
        }

        // Error correction suggestions
        if (data.length > 200 && currentConfig.errorCorrectionLevel === 'H') {
            suggestions.push({
                type: 'info',
                message: 'Consider reducing error correction level for shorter data.'
            });
        }

        // Color contrast suggestions
        const darkColor = this.hexToRgb(currentConfig.color.dark);
        const lightColor = this.hexToRgb(currentConfig.color.light);
        
        if (darkColor && lightColor) {
            const contrast = this.calculateContrast(darkColor, lightColor);
            if (contrast < 4.5) {
                suggestions.push({
                    type: 'warning',
                    message: 'Low color contrast may affect scanning reliability.'
                });
            }
        }

        return suggestions;
    }

    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    static calculateContrast(color1, color2) {
        const getLuminance = (color) => {
            const getRGB = (color) => {
                const sRGB = color / 255;
                return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
            };
            
            return 0.2126 * getRGB(color1.r) + 0.7152 * getRGB(color1.g) + 0.0722 * getRGB(color1.b);
        };

        const lum1 = getLuminance(color1);
        const lum2 = getLuminance(color2);
        
        return (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
    }

    static generateBatchQRCodes(dataArray, config) {
        const results = [];
        
        dataArray.forEach((data, index) => {
            try {
                const canvas = document.createElement('canvas');
                QRCode.toCanvas(canvas, data, config);
                
                results.push({
                    index,
                    data,
                    canvas,
                    success: true,
                    dataURL: canvas.toDataURL()
                });
            } catch (error) {
                results.push({
                    index,
                    data,
                    success: false,
                    error: error.message
                });
            }
        });

        return results;
    }

    static exportQRAnalytics(qrData) {
        return {
            dataType: this.detectDataType(qrData.data),
            complexity: this.estimateQRComplexity(qrData.data),
            estimatedScanTime: this.estimateScanTime(qrData.data, qrData.config),
            recommendations: this.suggestOptimizations(qrData.data, qrData.config)
        };
    }

    static detectDataType(data) {
        if (data.startsWith('http://') || data.startsWith('https://')) return 'URL';
        if (data.startsWith('mailto:')) return 'Email';
        if (data.startsWith('tel:')) return 'Phone';
        if (data.startsWith('sms:')) return 'SMS';
        if (data.startsWith('WIFI:')) return 'WiFi';
        if (data.startsWith('BEGIN:VCARD')) return 'Contact';
        if (data.startsWith('BEGIN:VEVENT')) return 'Event';
        if (data.startsWith('geo:')) return 'Location';
        return 'Text';
    }

    static estimateScanTime(data, config) {
        // Rough estimation based on data complexity and error correction
        const baseTime = 0.5; // seconds
        const lengthFactor = data.length / 100;
        const errorCorrectionFactors = { L: 1, M: 1.1, Q: 1.2, H: 1.3 };
        const errorFactor = errorCorrectionFactors[config.errorCorrectionLevel] || 1.1;
        
        return Math.round((baseTime + lengthFactor) * errorFactor * 10) / 10;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QRCodeUtils;
}