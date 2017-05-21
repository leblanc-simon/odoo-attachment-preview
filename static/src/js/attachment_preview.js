//-*- coding: utf-8 -*-

openerp.attachment_preview = function(instance) {
    var internal = {
        extract_all_pdf_img: true
    };

    internal.pdfConverter = function (pdf_file, callback_page, callback) {
        PDFJS.workerSrc = '/attachment_preview/static/vendor/pdfjs/pdf.worker.js';

        var loading_task = PDFJS.getDocument(pdf_file);

        loading_task.promise.then(
            function (pdf) {
                var page_number = 1;
                var max_pages;
                if (internal.extract_all_pdf_img === true) {
                    max_pages = pdf.pdfInfo.numPages;
                } else {
                    max_pages = 1;
                }

                var promises_page = [];
                for (; page_number <= max_pages; page_number++) {
                    promises_page[page_number - 1] = new Promise((resolve, reject) => {  
                        pdf.getPage(page_number).then(function(page) {
                            var scale = 1.5;
                            var viewport = page.getViewport(scale);
    
                            // Prepare canvas using PDF page dimensions
                            var canvas = document.createElement('canvas');
                            var context = canvas.getContext('2d');
                            canvas.height = viewport.height;
                            canvas.width = viewport.width;
    
                            // Render PDF page into canvas context
                            var renderContext = {
                                canvasContext: context,
                                viewport: viewport
                            };
    
                            var renderTask = page.render(renderContext);
                            renderTask.then(function () {
                                callback_page(canvas.toDataURL());
                                resolve();
                            });
                        });
                    });
                }

                Promise.all(promises_page).then((values) => {
                    callback();
                });
            },
            function (reason) {
                console.error('Fail to read PDF : ' + reason);
            }
        );
    };

    instance.web.Sidebar.include({
        on_attachments_loaded: function (attachments) {
            var result = this._super.apply(this, arguments);

            var image_regex = new RegExp('\\.(jpe?g|png|gif)$', 'i');
            var doc_regex = new RegExp('\\.do(c|t)x?$', 'i');
            var xls_regex = new RegExp('\\.xlsx?$', 'i');
            var pdf_regex = new RegExp('\\.pdf$', 'i');
            var ppt_regex = new RegExp('\\.pptx?$', 'i');
            var main_div_id = 'attachment_preview';
            var main_div = '<div id="' + main_div_id + '" class="oe_form_sheet o_form_sheet">' +
                                '<div class="oe_horizontal_separator o_horizontal_separator oe_clear">Pièce(s) jointe(s)</div>' +
                                '<div class="container-preview"></div>' +
                            '</div>';
            var a_preview_tpl = '<a href="%download%">' +
                                    '<img src="%img%" %img-box% />' +
                                    '<div>%name%</div>' +
                                '</a>';
            var div_preview_tpl = '<div class="attachment-preview-item" id="attachment-preview-item-%id%">' +
                                    a_preview_tpl +
                                  '</div>';

            var $main_div = $('#' + main_div_id);

            if (attachments.length === 0) {
                $main_div.remove();
                return result;
            }

            if ($main_div.length === 0) {
                $('.oe_form_sheetbg, .o_form_sheet_bg').append(main_div);
                $main_div = $('#' + main_div_id);
            }

            $preview_container = $main_div.find('.container-preview');
            $preview_container.html('');

            attachments.forEach(function (attachment) {
                var img = '/attachment_preview/static/img/raw.svg';
                var img_box = '';

                if (image_regex.test(attachment.name) === true) {
                    img = attachment.url.replace('saveas', 'image');
                    img_box = 'data-touchtouch="' + img + '"';
                } else if (doc_regex.test(attachment.name) === true) {
                    img = '/attachment_preview/static/img/doc.svg';
                } else if (xls_regex.test(attachment.name) === true) {
                    img = '/attachment_preview/static/img/xls.svg';
                } else if (pdf_regex.test(attachment.name) === true) {
                    img = '/attachment_preview/static/img/pdf.svg';
                } else if (ppt_regex.test(attachment.name) === true) {
                    img = '/attachment_preview/static/img/ppt.svg';
                }

                div_preview = div_preview_tpl
                    .replace('%id%', attachment.id)
                    .replace('%download%', attachment.url)
                    .replace('%img%', img)
                    .replace('%name%', attachment.name)
                    .replace('%img-box%', img_box)
                ;

                $preview_container.append(div_preview);

                if (pdf_regex.test(attachment.name) === true) {
                    internal.pdfConverter(attachment.url, function (data_url) {
                        var a_preview = a_preview_tpl
                            .replace('%download%', attachment.url)
                            .replace('%img%', data_url)
                            .replace('%name%', attachment.name)
                            .replace('%img-box%', 'data-touchtouch="' + data_url + '"')
                        ;
                        $preview_container.find('#attachment-preview-item-' + attachment.id).append(a_preview);
                        //console.log(data_url);
                    }, function () {
                        $preview_container.find('#attachment-preview-item-' + attachment.id).find('a').eq(0).remove();
                        $preview_container.find('[data-touchtouch]').touchTouch();
                    });
                }
            });

            $('#galleryOverlay').remove();
            $preview_container.find('[data-touchtouch]').touchTouch();

            return result;
        }
    });
}

