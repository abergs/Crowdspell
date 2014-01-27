var CrowdSpell;
(function (CrowdSpell) {
    var CorrectionEntity = (function () {
        function CorrectionEntity() {
            this.Url = "";
            this.Correction = "";
            this.Was = "";
            this.Context = "";
            this.ApiKey = "";
        }
        return CorrectionEntity;
    })();

    var CrowdSpellApp = (function () {
        function CrowdSpellApp() {
            var _this = this;
            this.apiEndpoint = "http://crowdspell.se/api/Corrections";
            this.el = document.getElementById("crowdspell");
            this.APIkey = this.el.getAttribute("data-apikey");

            this.editor = new Editor(function (success) {
                return _this.ClosedEditor(success);
            });
            this.button = new Bubble(function (e, s) {
                _this.ShowEditor(e, s);
                return false;
            });
        }
        CrowdSpellApp.prototype.ClosedEditor = function (correction) {
            if (correction !== null) {
                this.button.ShowMessage("Correction sent!", 2600);
                this.SendCorrection(correction);
            } else {
                this.button.Enable();
            }
        };

        CrowdSpellApp.prototype.ShowEditor = function (event, selection) {
            this.activeCorrection = new CorrectionEntity();
            this.button.Disable();
            this.button.Hide();

            this.editor.Show(selection, event.pageY);
        };

        CrowdSpellApp.prototype.SendCorrection = function (correction) {
            correction.ApiKey = this.APIkey;
            if ('withCredentials' in new XMLHttpRequest()) {
                /* supports cross-domain requests */
                var oReq = new XMLHttpRequest();
                oReq.open("post", this.apiEndpoint, true);
                oReq.setRequestHeader("Content-Type", "application/json");
                oReq.send(JSON.stringify(correction));
            }
        };
        return CrowdSpellApp;
    })();

    var Bubble = (function () {
        function Bubble(clickHandler) {
            this.enabled = true;
            this.el = StaticResources.ActivateBubble();

            this.clickHandler = clickHandler;
            this.innerLink = document.getElementById("crowdspell-button");

            // create dom element and insert it after our script tag?
            // setup events
            this.SetupEvents();
        }
        Bubble.prototype.SetupHTML = function () {
            var div = document.createElement('div');
            div.innerHTML = StaticResources.BubbleHtml;

            var root = document.getElementById("crowdspell");
            var tmpEl = div.firstElementChild;

            root.parentNode.insertBefore(tmpEl, root);
            this.el = tmpEl;
        };

        Bubble.prototype.Disable = function () {
            this.enabled = false;
        };

        Bubble.prototype.Enable = function () {
            this.enabled = true;
        };

        Bubble.prototype.Hide = function () {
            var _this = this;
            this.el.className = "text-options fade";

            setTimeout(function () {
                if (_this.el.className == "text-options fade") {
                    _this.el.className = "text-options";
                    _this.el.style.top = '-999px';
                    _this.el.style.left = '-999px';
                }
            }, 260);
        };

        Bubble.prototype.ShowMessage = function (msg, timeout) {
            var _this = this;
            var original = this.GetText();
            this.SetText(msg);
            this.Show();

            setTimeout(function () {
                _this.Hide();
                _this.Selection.removeAllRanges();
                _this.Enable();
            }, timeout);
            setTimeout(function () {
                _this.SetText(original);
            }, timeout + 250);
        };

        Bubble.prototype.SetText = function (text) {
            this.innerLink.textContent = text;
        };
        Bubble.prototype.GetText = function () {
            return this.innerLink.textContent;
        };

        Bubble.prototype.Show = function () {
            this.UpdateBubblePosition();
            this.el.className = "text-options active";
        };

        Bubble.prototype.SetupEvents = function () {
            var _this = this;
            // Action
            this.el.onclick = function (ev) {
                return _this.clickHandler(ev, _this.Selection);
            };

            // Mouse bindings
            document.onmousedown = function (event) {
                //document.onmousedown(event);
                _this.CheckTextHighlighting(event);
            };

            document.onmouseup = function (event) {
                setTimeout(function () {
                    return _this.CheckTextHighlighting(event);
                }, 1);
            };

            // Window bindings
            window.addEventListener('resize', function (event) {
                return _this.UpdateBubblePosition();
            });
        };

        Bubble.prototype.CheckTextHighlighting = function (event) {
            if (!this.enabled)
                return;

            var selection = window.getSelection();
            this.Selection = selection;

            // Check selections exist
            if (selection.isCollapsed === true) {
                this.Hide();
            }

            // Text is selected
            if (selection.isCollapsed === false) {
                // Show the ui bubble
                this.Show();
            }
        };

        Bubble.prototype.UpdateBubblePosition = function () {
            var boundary = this.lastBoundary;
            if (this.Selection != null && this.Selection.toString() !== "") {
                var selection = this.Selection;
                var range = selection.getRangeAt(0);
                boundary = range.getBoundingClientRect();
                this.lastBoundary = boundary;
            }

            this.el.style.top = boundary.top - 5 + window.pageYOffset + "px";
            this.el.style.left = (boundary.left + boundary.right) / 2 + "px";
        };
        return Bubble;
    })();

    var Editor = (function () {
        function Editor(closeCallback) {
            this.editor = document.getElementById("crowdspell-editor");
            this.editor = StaticResources.ActivateEditor();
            this.closeCallback = closeCallback;

            this.closeButton = document.getElementById("crowdspell-button-close");
            this.correctionInput = document.getElementById("crowdspell-correction");
            this.SetupButtonEvent();
        }
        Editor.prototype.Show = function (selection, topOffset) {
            this.Selection = selection;
            this.anchorNode = selection.anchorNode;
            this.selectedText = selection.toString();
            this.SetDialogData();

            this.ShowDialog(topOffset);
            this.correctionInput.focus();
        };

        Editor.prototype.SetupButtonEvent = function () {
            var _this = this;
            this.editor.addEventListener("keydown", function (keyEvent) {
                if (keyEvent.keyCode === 27) {
                    _this.Close(null);
                }
            });

            this.closeButton.onclick = function (ev) {
                _this.Close(null);
            };

            var saveButton = document.getElementById("crowdspell-button-save");

            saveButton.onclick = function () {
                var changedText = _this.correctionInput.value;

                var corr = new CorrectionEntity();
                corr.Was = _this.selectedText;
                corr.Correction = changedText;
                corr.Url = location.toString();

                if (_this.anchorNode != null) {
                    corr.Context = _this.anchorNode.textContent.substr(0, 140);
                }

                _this.Close(corr);
            };
        };

        Editor.prototype.Close = function (callBackArgument) {
            this.Hide();
            this.closeCallback(callBackArgument);
        };

        Editor.prototype.Hide = function () {
            if (this.editor.getAttribute("data-open") !== null) {
                this.editor.removeAttribute("data-open");
            }
        };

        Editor.prototype.ShowDialog = function (topOffset) {
            this.editor.style.top = topOffset + "px";

            if (this.editor.getAttribute("data-open") === null) {
                this.editor.setAttribute("data-open", "open");
            }
        };

        Editor.prototype.SetDialogData = function () {
            var misstake = document.getElementById("crowdspell-misstake");
            var correction = this.correctionInput;

            misstake.innerHTML = this.selectedText;
            correction.value = this.selectedText;
        };
        return Editor;
    })();

    var Resources = (function () {
        function Resources() {
            this.ConstructEdiotrHtml();
            this.ConstructButtonHtml();
        }
        Resources.prototype.GetElement = function (html) {
            var div = document.createElement('div');
            div.innerHTML = html;
            return div.firstElementChild;
        };

        Resources.prototype.ActivateElement = function (element) {
            var root = document.getElementById("crowdspell");
            root.parentNode.insertBefore(element, root);
        };

        Resources.prototype.ActivateHtml = function (html) {
            var el = this.GetElement(html);
            this.ActivateElement(el);
            return el;
        };

        Resources.prototype.ActivateEditor = function () {
            return this.ActivateHtml(this.EditorHtml);
        };

        Resources.prototype.ActivateBubble = function () {
            return this.ActivateHtml(this.BubbleHtml);
        };

        Resources.prototype.ConstructEdiotrHtml = function () {
            var strVar = "";
            strVar += "<div id='crowdspell-editor'>";
            strVar += "    <h3>Hello! Help by correcting the spelling error.<\/h3>";
            strVar += "    <div class=\"crowdspell-label\">Was:<\/div><div id=\"crowdspell-misstake\"><\/div>";
            strVar += "";
            strVar += "    <div class=\"crowdspell-label\">Correction<\/div>";
            strVar += "    <div>";
            strVar += "        <textarea id=\"crowdspell-correction\"><\/textarea>";
            strVar += "    <\/div>";
            strVar += "    <div class=\"crowdspell-actions\">";
            strVar += "        <button id=\"crowdspell-button-save\">Send correction<\/button>";
            strVar += "        <span id=\"crowdspell-button-close\">Close<\/span>";
            strVar += "    <\/div>";
            strVar += "<\/div>";
            strVar += "";

            this.EditorHtml = strVar;
        };

        Resources.prototype.ConstructButtonHtml = function () {
            var strVar = "";
            strVar += "    <div id=\"crowdspell-button-wrapper\" class=\"text-options\" style=\"top: -5px; left: 0px;\">";
            strVar += "        <div class=\"options\">";
            strVar += "            <a href=\"#\" id=\"crowdspell-button\" class=\"crowdspell-button\">Correct typo<\/a>";
            strVar += "        <\/div>";
            strVar += "    <\/div>";

            this.BubbleHtml = strVar;
        };
        return Resources;
    })();

    var StaticResources = new Resources();
    var _crowdSpell = new CrowdSpellApp();
})(CrowdSpell || (CrowdSpell = {}));
//# sourceMappingURL=crowdspell.js.map
