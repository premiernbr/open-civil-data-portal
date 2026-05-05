(function() {
    if (typeof window === 'undefined') {
        return;
    }
    if (window.nsijQrWidgetLoaded) {
        return;
    }
    window.nsijQrWidgetLoaded = true;

    var delayMs = 1800;
    var scriptUrl = document.currentScript && document.currentScript.src ? document.currentScript.src : '';

    function assetUrl(path) {
        if (!scriptUrl) {
            return path;
        }
        try {
            return new URL(path, scriptUrl).toString();
        } catch (error) {
            return path;
        }
    }

    function ensureStylesheet() {
        if (document.querySelector('link[href*="nsij-qr-widget.css"]')) {
            return;
        }

        var stylesheet = document.createElement('link');
        stylesheet.rel = 'stylesheet';
        stylesheet.href = assetUrl('../css/nsij-qr-widget.css');
        document.head.appendChild(stylesheet);
    }

    function ensureQRCodeLibrary(callback) {
        if (window.QRCode && window.QRCode.CorrectLevel) {
            callback();
            return;
        }

        var existingScript = document.querySelector('script[src*="qrcode.min.js"]');
        if (existingScript) {
            existingScript.addEventListener('load', callback, { once: true });
            existingScript.addEventListener('error', function() {
                errorMessage.textContent = 'تعذر تحميل مكتبة QR Code المحلية.';
            }, { once: true });
            return;
        }

        var script = document.createElement('script');
        script.src = assetUrl('../vendor/qrcode.min.js');
        script.async = true;
        script.onload = callback;
        script.onerror = function() {
            errorMessage.textContent = 'تعذر تحميل مكتبة QR Code المحلية.';
        };
        document.head.appendChild(script);
    }

    function createElement(tag, attrs, children) {
        var element = document.createElement(tag);
        if (attrs) {
            Object.keys(attrs).forEach(function(key) {
                if (key === 'class') {
                    element.className = attrs[key];
                } else if (key === 'text') {
                    element.textContent = attrs[key];
                } else {
                    element.setAttribute(key, attrs[key]);
                }
            });
        }
        if (children) {
            children.forEach(function(child) {
                if (typeof child === 'string') {
                    element.appendChild(document.createTextNode(child));
                } else if (child) {
                    element.appendChild(child);
                }
            });
        }
        return element;
    }

    function openModal() {
        if (widgetContainer) {
            widgetContainer.style.display = 'none';
        }
        document.body.classList.add('nsij-qr-modal-open');
        overlay.classList.add('nsij-qr-overlay--visible');
        modal.classList.remove('nsij-qr-hidden');
        clearStatus();
        nameField.focus();
    }

    function closeModal() {
        overlay.classList.remove('nsij-qr-overlay--visible');
        modal.classList.add('nsij-qr-hidden');
        clearStatus();
        setTimeout(function() {
            if (widgetContainer) {
                widgetContainer.style.display = 'block';
            }
        }, 260);
    }

    function closeWidget() {
        if (widgetContainer) {
            widgetContainer.style.display = 'none';
        }
    }

    function clearStatus() {
        errorMessage.textContent = '';
        statusMessage.textContent = '';
    }

    function validateForm() {
        var cardType = cardTypeField.value;
        var name = nameField.value.trim();
        var linkName = linkNameField.value.trim();
        var url = urlField.value.trim();

        if (!name) {
            if (cardType === 'personal') {
                return 'المرجو إدخال الاسم';
            }
            return 'المرجو إدخال اسم المؤسسة أو الجمعية أو الشركة أو الهيئة';
        }

        if (!linkName) {
            if (cardType === 'personal') {
                return 'المرجو إدخال النسب';
            }
            return 'المرجو إدخال اسم الشخص';
        }

        if (!url || !/^https?:\/\//i.test(url)) {
            return 'المرجو إدخال رابط صحيح يبدأ بـ http:// أو https://';
        }
        return '';
    }

    function updateFormLabels() {
        var isPersonal = cardTypeField.value === 'personal';
        nameLabel.textContent = isPersonal ? 'الاسم' : 'اسم المؤسسة / الجمعية / الشركة / الهيئة';
        nameField.placeholder = isPersonal ? 'الاسم' : 'اسم المؤسسة / الجمعية / الشركة / الهيئة';
        nameField.setAttribute('aria-label', isPersonal ? 'الاسم' : 'اسم المؤسسة / الجمعية / الشركة / الهيئة');

        linkNameLabel.textContent = isPersonal ? 'النسب' : 'اسم الشخص';
        linkNameField.placeholder = isPersonal ? 'النسب' : 'اسم الشخص';
        linkNameField.setAttribute('aria-label', isPersonal ? 'النسب' : 'اسم الشخص');
    }

    function createPaddedQrCanvas(sourceCanvas) {
        var padding = 40;
        var qrSize = 240;
        var paddedCanvas = document.createElement('canvas');
        paddedCanvas.width = qrSize + padding * 2;
        paddedCanvas.height = qrSize + padding * 2;
        var ctx = paddedCanvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, paddedCanvas.width, paddedCanvas.height);
        ctx.drawImage(sourceCanvas, padding, padding, qrSize, qrSize);
        return paddedCanvas;
    }

    function buildPreviewDetails(data) {
        var previewCard = createElement('div', { class: 'nsij-qr-preview-card' });
        previewCard.appendChild(createElement('div', { class: 'nsij-qr-preview-title' }, [data.name]));

        if (data.cardType === 'organization' && data.secondaryName) {
            previewCard.appendChild(createElement('div', { class: 'nsij-qr-preview-subtitle' }, [data.secondaryName]));
        }

        if (data.linkType) {
            var badgeRow = createElement('div', { class: 'nsij-qr-preview-meta' }, [
                createElement('span', { class: 'nsij-qr-preview-badge' }, [data.linkType])
            ]);
            previewCard.appendChild(badgeRow);
        }

        previewCard.appendChild(createElement('div', { class: 'nsij-qr-preview-url' }, [data.url]));

        if (data.address) {
            previewCard.appendChild(createElement('div', { class: 'nsij-qr-preview-address' }, [data.address]));
        }

        return previewCard;
    }

    function renderQRCode(url) {
        previewContainer.replaceChildren();
        var wrapper = createElement('div', { class: 'nsij-qr-preview-inner' });
        previewContainer.appendChild(wrapper);

        new QRCode(wrapper, {
            text: url,
            width: 240,
            height: 240,
            colorDark: '#111827',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });

        var rawCanvas = wrapper.querySelector('canvas');
        if (!rawCanvas) {
            errorMessage.textContent = 'حدث خطأ أثناء إنشاء QR Code. حاول مرة أخرى.';
            downloadCardButton.disabled = true;
            downloadQrButton.disabled = true;
            copyButton.disabled = true;
            return;
        }

        var paddedCanvas = createPaddedQrCanvas(rawCanvas);
        previewContainer.replaceChildren();
        previewContainer.appendChild(paddedCanvas);

        downloadCardButton.disabled = false;
        downloadQrButton.disabled = false;
        copyButton.disabled = false;
        previewContainer.classList.remove('nsij-qr-hidden');
        statusMessage.textContent = 'تم إنشاء QR Code بنجاح.';
        currentUrl = url;
        currentQrRawCanvas = rawCanvas;
        currentQrPaddedCanvas = paddedCanvas;
        currentData = {
            cardType: cardTypeField.value,
            name: nameField.value.trim(),
            secondaryName: linkNameField.value.trim(),
            linkType: linkTypeField.value,
            url: url,
            address: addressField.value.trim()
        };
    }

    function resetPreview() {
        previewContainer.replaceChildren();
        previewContainer.classList.add('nsij-qr-hidden');
        downloadCardButton.disabled = true;
        downloadQrButton.disabled = true;
        copyButton.disabled = true;
        currentUrl = '';
        currentQrRawCanvas = null;
        currentQrPaddedCanvas = null;
        currentData = null;
    }

    function handleGenerate() {
        clearStatus();
        var validation = validateForm();
        if (validation) {
            errorMessage.textContent = validation;
            resetPreview();
            return;
        }
        ensureQRCodeLibrary(function() {
            renderQRCode(urlField.value.trim());
        });
    }

    function createCardCanvas(data, qrCanvas) {
        var canvas = document.createElement('canvas');
        canvas.width = 1480;
        canvas.height = 780;

        var ctx = canvas.getContext('2d');

        if (!ctx || !qrCanvas) {
            throw new Error('Could not initialize card canvas');
        }

        var isPersonal = data.cardType === 'personal';

        var firstLine = String(data.name || '').trim();
        var secondLine = String(data.secondaryName || '').trim();

        var fullName = isPersonal
            ? [firstLine, secondLine].filter(Boolean).join(' ').trim()
            : firstLine;

        var secondaryText = isPersonal ? '' : secondLine;

        var linkTypeLabel = String(data.linkType || '').trim();
        var displayLinkType = linkTypeLabel ? ('رابط ' + linkTypeLabel) : 'رابط رقمي';

        var urlText = String(data.url || '').trim();
        var addressText = String(data.address || '').trim();

        ctx.textBaseline = 'alphabetic';
        ctx.direction = 'rtl';

        // Clip all exported card drawing to the rounded card shape.
        var cardRadius = 32;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cardRadius, 0);
        ctx.lineTo(canvas.width - cardRadius, 0);
        ctx.quadraticCurveTo(canvas.width, 0, canvas.width, cardRadius);
        ctx.lineTo(canvas.width, canvas.height - cardRadius);
        ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - cardRadius, canvas.height);
        ctx.lineTo(cardRadius, canvas.height);
        ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - cardRadius);
        ctx.lineTo(0, cardRadius);
        ctx.quadraticCurveTo(0, 0, cardRadius, 0);
        ctx.closePath();
        ctx.clip();

        // Card only - no external paper/background
        ctx.fillStyle = '#fffdf9';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        roundRect(ctx, 0, 0, 1480, 780, 32);
        ctx.fillStyle = '#fffdf9';
        ctx.fill();

        ctx.strokeStyle = '#d7b15a';
        ctx.lineWidth = 3;
        strokeRoundRect(ctx, 0, 0, 1480, 780, 32);

        // Elegant top strip without text
        var topGradient = ctx.createLinearGradient(0, 0, 1480, 0);
        topGradient.addColorStop(0, '#0f1d40');
        topGradient.addColorStop(0.55, '#144d3a');
        topGradient.addColorStop(1, '#c2872a');

        ctx.fillStyle = topGradient;
        roundRect(ctx, 0, 0, 1480, 82, 32);
        ctx.fillRect(0, 42, 1480, 40);

        // QR block
        var qrBoxX = 68;
        var qrBoxY = 168;
        var qrBoxSize = 355;

        ctx.fillStyle = '#ffffff';
        roundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 24);
        ctx.fill();

        ctx.strokeStyle = '#d8b163';
        ctx.lineWidth = 3;
        strokeRoundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 24);

        var qrSize = 275;
        var qrX = qrBoxX + (qrBoxSize - qrSize) / 2;
        var qrY = qrBoxY + 38;

        ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#173f36';
        ctx.font = '700 24px "Segoe UI", Tahoma, Arial';
        ctx.fillText('امسح الرمز للوصول المباشر', qrBoxX + (qrBoxSize / 2), qrBoxY + qrBoxSize - 26);

        // Content area
        var textRight = 1388;

        ctx.textAlign = 'right';

        if (fullName) {
            ctx.fillStyle = '#12203b';
            ctx.font = isPersonal
                ? '700 60px "Segoe UI", Tahoma, Arial'
                : '700 54px "Segoe UI", Tahoma, Arial';

            wrapText(ctx, fullName, textRight, 230, 720, isPersonal ? 66 : 62, isPersonal ? 1 : 2);
        }

        if (secondaryText) {
            ctx.fillStyle = '#2f6a5f';
            ctx.font = '700 31px "Segoe UI", Tahoma, Arial';
            wrapText(ctx, secondaryText, textRight, 340, 720, 40, 2);
        }

        // Link type closer to the name and larger
        ctx.fillStyle = '#244f72';
        ctx.font = '700 36px "Segoe UI", Tahoma, Arial';
        ctx.fillText(displayLinkType, textRight, isPersonal ? 335 : 430);

        // Divider
        ctx.strokeStyle = '#e3d7bd';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(520, isPersonal ? 382 : 475);
        ctx.lineTo(1390, isPersonal ? 382 : 475);
        ctx.stroke();

        // URL label/value
        ctx.fillStyle = '#7a8497';
        ctx.font = '700 28px "Segoe UI", Tahoma, Arial';
        ctx.fillText('الرابط:', textRight, isPersonal ? 430 : 520);

        ctx.fillStyle = '#18243a';
        ctx.font = '700 24px "Segoe UI", Tahoma, Arial';
        wrapText(ctx, truncateMiddle(urlText, 72), textRight, isPersonal ? 475 : 565, 720, 34, 3);

        // Address
        if (addressText) {
            ctx.fillStyle = '#7a8497';
            ctx.font = '700 28px "Segoe UI", Tahoma, Arial';
            ctx.fillText('العنوان:', textRight, isPersonal ? 620 : 690);

            ctx.fillStyle = '#345d5a';
            ctx.font = '700 24px "Segoe UI", Tahoma, Arial';
            wrapText(ctx, addressText, textRight, isPersonal ? 665 : 735, 720, 32, 2);
        }

        // Footer note only
        ctx.textAlign = 'center';
        ctx.fillStyle = '#6c7487';
        ctx.font = '700 21px "Segoe UI", Tahoma, Arial';
        ctx.fillText('تم إنجاز البطاقة بمنصة النسيج المدني', 740, 735);
        // Stop clipping before applying the final transparent rounded mask.
        ctx.restore();

        // Force transparent corners outside the rounded card shape.
        ctx.save();
        ctx.globalCompositeOperation = 'destination-in';
        ctx.beginPath();
        ctx.moveTo(cardRadius, 0);
        ctx.lineTo(canvas.width - cardRadius, 0);
        ctx.quadraticCurveTo(canvas.width, 0, canvas.width, cardRadius);
        ctx.lineTo(canvas.width, canvas.height - cardRadius);
        ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - cardRadius, canvas.height);
        ctx.lineTo(cardRadius, canvas.height);
        ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - cardRadius);
        ctx.lineTo(0, cardRadius);
        ctx.quadraticCurveTo(0, 0, cardRadius, 0);
        ctx.closePath();
        ctx.fillStyle = '#000000';
        ctx.fill();
        ctx.restore();

        // Final clean outer border after masking.
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = '#d7b15a';
        ctx.lineWidth = 3;
        strokeRoundRect(ctx, 1.5, 1.5, canvas.width - 3, canvas.height - 3, cardRadius);
        ctx.restore();

        return canvas;
    }

    function strokeRoundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.stroke();
    }

    function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
        var words = String(text || '').split(/\s+/);
        var line = '';
        var lines = [];
        for (var index = 0; index < words.length; index++) {
            var testLine = line ? line + ' ' + words[index] : words[index];
            if (ctx.measureText(testLine).width > maxWidth && line) {
                lines.push(line);
                line = words[index];
            } else {
                line = testLine;
            }
        }
        if (line) {
            lines.push(line);
        }
        if (lines.length > maxLines) {
            lines = lines.slice(0, maxLines);
            lines[maxLines - 1] = truncateMiddle(lines[maxLines - 1], 34);
        }
        for (var lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            ctx.fillText(lines[lineIndex], x, y + lineIndex * lineHeight);
        }
    }

    function truncateMiddle(value, maxLength) {
        var text = String(value || '');
        if (text.length <= maxLength) {
            return text;
        }
        var headLength = Math.ceil((maxLength - 3) * 0.58);
        var tailLength = maxLength - 3 - headLength;
        return text.substring(0, headLength) + '...' + text.substring(text.length - tailLength);
    }

    function roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
    }

    function handleDownloadCard() {
        if (!currentData || !currentUrl || !currentQrPaddedCanvas) {
            return;
        }
        try {
            var cardCanvas = createCardCanvas(currentData, currentQrPaddedCanvas);
            var dataUrl = cardCanvas.toDataURL('image/png');
            var link = document.createElement('a');
            link.href = dataUrl;
            link.download = 'nsij-qr-card.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            statusMessage.textContent = 'تم تحميل البطاقة بنجاح';
            clearForm();
            resetPreview();
            setTimeout(function() {
                closeModal();
            }, 800);
        } catch (error) {
            statusMessage.textContent = 'فشل تحميل البطاقة. حاول مرة أخرى.';
        }
    }

    function handleDownloadQr() {
        if (!currentUrl || !currentQrPaddedCanvas) {
            return;
        }
        try {
            var dataUrl = currentQrPaddedCanvas.toDataURL('image/png');
            var link = document.createElement('a');
            link.href = dataUrl;
            link.download = 'nsij-civil-qr-code.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            statusMessage.textContent = 'تم تحميل QR Code بنجاح';
            clearForm();
            resetPreview();
            setTimeout(function() {
                closeModal();
            }, 800);
        } catch (error) {
            statusMessage.textContent = 'فشل تحميل QR Code. حاول مرة أخرى.';
        }
    }

    function clearForm() {
        nameField.value = '';
        linkNameField.value = '';
        linkTypeField.value = '';
        urlField.value = '';
    }

    function handleCopy() {
        if (!currentUrl || !currentQrPaddedCanvas) {
            return;
        }
        if (navigator.clipboard && navigator.clipboard.write) {
            currentQrPaddedCanvas.toBlob(function(blob) {
                if (!blob) {
                    copyUrlFallback();
                    return;
                }
                var item = new ClipboardItem({ 'image/png': blob });
                navigator.clipboard.write([item]).then(function() {
                    statusMessage.textContent = 'تم نسخ QR بنجاح';
                }).catch(function() {
                    copyUrlFallback();
                });
            });
        } else {
            copyUrlFallback();
        }
    }

    function copyUrlFallback() {
        var url = currentUrl || urlField.value.trim();
        if (!url) {
            return;
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(function() {
                statusMessage.textContent = 'تم نسخ الرابط المرتبط بـ QR';
            }).catch(function() {
                fallbackTextAreaCopy(url);
            });
        } else {
            fallbackTextAreaCopy(url);
        }
    }

    function fallbackTextAreaCopy(text) {
        var textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
            document.execCommand('copy');
            statusMessage.textContent = 'تم نسخ الرابط المرتبط بـ QR';
        } catch (err) {
            statusMessage.textContent = 'تعذر نسخ الرابط. حاول مرة أخرى.';
        }
        document.body.removeChild(textarea);
    }

    function handleKeydown(event) {
        if (!modal || event.key !== 'Escape') {
            return;
        }
        if (!modal.classList.contains('nsij-qr-hidden')) {
            event.preventDefault();
            closeModal();
        }
    }

    var currentUrl = '';
    var currentData = null;
    var currentQrRawCanvas = null;
    var currentQrPaddedCanvas = null;
    var widgetContainer;
    var overlay;
    var modal;
    var nameField;
    var linkNameField;
    var linkTypeField;
    var cardTypeField;
    var addressField;
    var urlField;
    var nameLabel;
    var linkNameLabel;
    var errorMessage;
    var statusMessage;
    var downloadCardButton;
    var downloadQrButton;
    var copyButton;
    var generateButton;
    var previewContainer;

    function buildWidget() {
        widgetContainer = createElement('div', {
            class: 'nsij-qr-widget',
            role: 'button',
            tabindex: '0',
            'aria-label': 'QR مجاني',
            dir: 'rtl'
        });
        var closeBtn = createElement('button', {
            class: 'nsij-qr-widget__close',
            type: 'button',
            'aria-label': 'إغلاق'
        }, ['×']);
        var header = createElement('div', { class: 'nsij-qr-widget__header' }, [
            createElement('div', { class: 'nsij-qr-widget__badge' }, ['🎁']),
            createElement('div', null, [
                createElement('div', { class: 'nsij-qr-widget__title' }, ['QR مجاني']),
                createElement('div', { class: 'nsij-qr-widget__text' }, ['أدخل رابطك وخذ هديتك'])
            ])
        ]);

        widgetContainer.appendChild(closeBtn);
        widgetContainer.appendChild(header);

        widgetContainer.addEventListener('click', function(event) {
            if (event.target === closeBtn) {
                return;
            }
            openModal();
        });
        closeBtn.addEventListener('click', function(event) {
            event.stopPropagation();
            closeWidget();
        });
        widgetContainer.addEventListener('keydown', function(event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openModal();
            }
        });

        document.body.appendChild(widgetContainer);

        overlay = createElement('div', { class: 'nsij-qr-overlay nsij-qr-overlay--visible' });
        overlay.classList.remove('nsij-qr-overlay--visible');
        overlay.addEventListener('click', closeModal);
        document.body.appendChild(overlay);

        modal = createElement('div', {
            class: 'nsij-qr-modal nsij-qr-hidden',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-labelledby': 'nsij-qr-title',
            dir: 'rtl'
        });
        var panel = createElement('div', { class: 'nsij-qr-modal__panel' });
        var headerGroup = createElement('div', { class: 'nsij-qr-modal__header' }, [
            createElement('div', null, [
                createElement('h2', {
                    class: 'nsij-qr-modal__title',
                    id: 'nsij-qr-title'
                }, ['أنشئ بطاقة QR مجانًا']),
                createElement('p', {
                    class: 'nsij-qr-modal__description'
                }, ['أدخل معلوماتك ثم حمّل بطاقة أنيقة تحتوي على اسم المؤسسة أو الشخص، اسم الرابط، ونظام QR جاهز للطباعة أو المشاركة.'])
            ]),
            createElement('button', {
                class: 'nsij-qr-modal__close',
                type: 'button',
                'aria-label': 'إغلاق النافذة'
            }, ['×'])
        ]);

        panel.appendChild(headerGroup);

        var form = createElement('div', { class: 'nsij-qr-form' });
        cardTypeField = createElement('select', {
            class: 'nsij-qr-input nsij-qr-card-type-select',
            'aria-label': 'نوع البطاقة'
        });
        cardTypeField.appendChild(createElement('option', { value: 'personal' }, ['بطاقة شخصية']));
        cardTypeField.appendChild(createElement('option', { value: 'organization' }, ['بطاقة معنوية']));
        cardTypeField.addEventListener('change', function() {
            updateFormLabels();
            resetPreview();
        });

        nameField = createElement('input', {
            class: 'nsij-qr-input',
            type: 'text',
            placeholder: 'اسم المؤسسة أو الشخص',
            'aria-label': 'اسم المؤسسة أو الشخص'
        });
        linkNameField = createElement('input', {
            class: 'nsij-qr-input',
            type: 'text',
            placeholder: 'اسم الرابط',
            'aria-label': 'اسم الرابط'
        });
        linkTypeField = createElement('select', {
            class: 'nsij-qr-input',
            'aria-label': 'نوع الرابط (اختياري)'
        });
        var optionEmpty = createElement('option', { value: '' }, ['-- اختر نوع الرابط (اختياري) --']);
        linkTypeField.appendChild(optionEmpty);
        var linkTypes = [
            'موقع ويب',
            'واتساب',
            'فيسبوك',
            'إنستغرام',
            'لينكدإن',
            'يوتيوب',
            'تليغرام',
            'تطبيق',
            'رابط آخر'
        ];
        linkTypes.forEach(function(type) {
            var option = createElement('option', { value: type }, [type]);
            linkTypeField.appendChild(option);
        });
        addressField = createElement('input', {
            class: 'nsij-qr-input',
            type: 'text',
            placeholder: 'العنوان (اختياري)',
            'aria-label': 'العنوان (اختياري)'
        });
        urlField = createElement('input', {
            class: 'nsij-qr-input',
            type: 'url',
            placeholder: 'https://example.com',
            'aria-label': 'الرابط'
        });
        errorMessage = createElement('div', { class: 'nsij-qr-error', role: 'alert' });
        generateButton = createElement('button', {
            class: 'nsij-qr-button nsij-qr-button--primary',
            type: 'button'
        }, ['إنشاء QR Code']);
        statusMessage = createElement('div', { class: 'nsij-qr-status' });
        previewContainer = createElement('div', { class: 'nsij-qr-preview nsij-qr-hidden', 'aria-live': 'polite' });
        downloadCardButton = createElement('button', {
            class: 'nsij-qr-button nsij-qr-button--secondary',
            type: 'button',
            disabled: 'disabled'
        }, ['تحميل البطاقة']);
        downloadQrButton = createElement('button', {
            class: 'nsij-qr-button nsij-qr-button--ghost',
            type: 'button',
            disabled: 'disabled'
        }, ['تحميل QR فقط']);
        copyButton = createElement('button', {
            class: 'nsij-qr-button nsij-qr-button--ghost',
            type: 'button',
            disabled: 'disabled'
        }, ['نسخ الرابط']);

        form.appendChild(createElement('label', { class: 'nsij-qr-label' }, ['نوع البطاقة']));
        form.appendChild(cardTypeField);
        nameLabel = createElement('label', { class: 'nsij-qr-label' }, ['اسم المؤسسة أو الشخص']);
        form.appendChild(nameLabel);
        form.appendChild(nameField);
        linkNameLabel = createElement('label', { class: 'nsij-qr-label' }, ['اسم الرابط']);
        form.appendChild(linkNameLabel);
        form.appendChild(linkNameField);
        updateFormLabels();
        form.appendChild(createElement('label', { class: 'nsij-qr-label' }, ['نوع الرابط (اختياري)']));
        form.appendChild(linkTypeField);
        form.appendChild(createElement('label', { class: 'nsij-qr-label' }, ['الرابط']));
        form.appendChild(urlField);
        form.appendChild(createElement('label', { class: 'nsij-qr-label' }, ['العنوان (اختياري)']));
        form.appendChild(addressField);
        form.appendChild(errorMessage);
        form.appendChild(generateButton);
        form.appendChild(previewContainer);

        var actionRow = createElement('div', { class: 'nsij-qr-actions' }, [downloadCardButton, downloadQrButton, copyButton]);
        form.appendChild(actionRow);
        form.appendChild(statusMessage);
        panel.appendChild(form);
        modal.appendChild(panel);
        document.body.appendChild(modal);

        panel.querySelector('.nsij-qr-modal__close').addEventListener('click', closeModal);
        generateButton.addEventListener('click', handleGenerate);
        downloadCardButton.addEventListener('click', handleDownloadCard);
        downloadQrButton.addEventListener('click', handleDownloadQr);
        copyButton.addEventListener('click', handleCopy);
        urlField.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                handleGenerate();
            }
        });
    }

    function bootWidget() {
        ensureStylesheet();
        setTimeout(buildWidget, delayMs);
        document.addEventListener('keydown', handleKeydown);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootWidget, { once: true });
    } else {
        bootWidget();
    }
})();








