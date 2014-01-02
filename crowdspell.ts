module CrowdSpell {
    class CorrectionEntity {
        public Url: string = "";
        public Correction: string = "";
        public Was: string = "";
        public Context: string = "";
        public ApiKey: string = "";
    }

    class CrowdSpellApp {
        private selection: Selection;
        private APIkey: string;

        private editor: Editor;
        private button: Bubble;

        private apiEndpoint: string = "http://crowdspell.se/api/Corrections";

        private activeCorrection: CorrectionEntity;
        private el: Element;
        constructor() {
            this.el = document.getElementById("crowdspell");
            this.APIkey = this.el.getAttribute("data-apikey");

            this.editor = new Editor((success) => this.ClosedEditor(success));
            this.button = new Bubble((e, s) => { this.ShowEditor(e, s); return false; });
        }

        ClosedEditor(correction: CorrectionEntity) {
            if (correction !== null) {

                this.button.ShowMessage("Correction sent!", 2600);
                this.SendCorrection(correction);
            } else {

                this.button.Enable();
            }

        }

        ShowEditor(event: MouseEvent, selection: Selection) {
            this.activeCorrection = new CorrectionEntity();
            this.button.Disable();
            this.button.Hide();
            
            this.editor.Show(selection, event.pageY);
        }

        SendCorrection(correction: CorrectionEntity) {
            correction.ApiKey = this.APIkey;
            if ('withCredentials' in new XMLHttpRequest()) {
                /* supports cross-domain requests */

                var oReq = new XMLHttpRequest();
                oReq.open("post", this.apiEndpoint, true);
                oReq.setRequestHeader("Content-Type", "application/json");
                oReq.send(JSON.stringify(correction));
            }
        }
    }

    class Bubble {

        private el: HTMLElement;
        private clickHandler: (ev, selection: Selection) => void;
        public Selection: Selection;
        private innerLink: HTMLElement;
        constructor(clickHandler: (ev, selection: Selection) => void) {
            this.el = StaticResources.ActivateBubble();

            this.clickHandler = clickHandler;
            this.innerLink = document.getElementById("crowdspell-button");
            // create dom element and insert it after our script tag?

            // setup events
            this.SetupEvents();
        }
        private enabled: boolean = true;

        SetupHTML() {
            var div = document.createElement('div');
            div.innerHTML = StaticResources.BubbleHtml;

            var root = document.getElementById("crowdspell");
            var tmpEl = <HTMLElement> div.firstElementChild;

            root.parentNode.insertBefore(tmpEl, root);
            this.el = tmpEl;
        }

        Disable() {
            this.enabled = false;
        }

        Enable() {
            this.enabled = true;
        }

        Hide() {

            this.el.className = "text-options fade";

            setTimeout(() => {

                if (this.el.className == "text-options fade") {

                    this.el.className = "text-options";
                    this.el.style.top = '-999px';
                    this.el.style.left = '-999px';
                }
            }, 260)
        }

        ShowMessage(msg: string, timeout: number) {
            var original = this.GetText();
            this.SetText(msg);
            this.Show();

            setTimeout(() => {
                this.Hide();
                this.Selection.removeAllRanges();
                this.Enable();
            }, timeout);
            setTimeout(() => {
                this.SetText(original);
            }, timeout + 250);
        }

        SetText(text: string) {
            this.innerLink.textContent = text;
        }
        GetText(): string {
            return this.innerLink.textContent;
        }

        Show() {
            this.UpdateBubblePosition();
            this.el.className = "text-options active";
        }

        SetupEvents() {

            // Action
            this.el.onclick = (ev) => this.clickHandler(ev, this.Selection);

            // Mouse bindings
            document.onmousedown = (event) => {
                //document.onmousedown(event);
                this.CheckTextHighlighting(event);
            };

            document.onmouseup = (event) => {
                setTimeout(() => this.CheckTextHighlighting(event), 1);
            };

            // Window bindings
            window.addEventListener('resize', (event) => this.UpdateBubblePosition());
        }

        CheckTextHighlighting(event) {
            if (!this.enabled) return;

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
        }
        private lastBoundary;
        UpdateBubblePosition() {
            var boundary = this.lastBoundary;
            if (this.Selection != null && this.Selection.toString() !== "") {
                var selection = this.Selection;
                var range = selection.getRangeAt(0);
                boundary = range.getBoundingClientRect();
                this.lastBoundary = boundary;
            }


            this.el.style.top = boundary.top - 5 + window.pageYOffset + "px";
            this.el.style.left = (boundary.left + boundary.right) / 2 + "px";
        }
    }

    class Editor {
        private editor: HTMLElement = document.getElementById("crowdspell-editor");
        private closeButton: HTMLElement;

        private selectedText: string;
        private correctionInput: HTMLTextAreaElement;

        private closeCallback: (correction: CorrectionEntity) => void;
        constructor(closeCallback: (correction) => void) {

            this.editor = StaticResources.ActivateEditor();
            this.closeCallback = closeCallback;

            this.closeButton = document.getElementById("crowdspell-button-close");
            this.correctionInput = <HTMLTextAreaElement> document.getElementById("crowdspell-correction");
            this.SetupButtonEvent();
        }

        public Selection: Selection;
        private anchorNode: Node;
        public Show(selection: Selection, topOffset: number) {
            this.Selection = selection;
            this.anchorNode = selection.anchorNode;
            this.selectedText = selection.toString();
            this.SetDialogData()

            this.ShowDialog(topOffset);
            this.correctionInput.focus();
        }

        private SetupButtonEvent() {
            this.closeButton.onclick = (ev: MouseEvent) => {
                this.Hide();
                this.closeCallback(null);
            };

            var saveButton = document.getElementById("crowdspell-button-save");

            saveButton.onclick = () => {
                var changedText = this.correctionInput.value;

                var corr = new CorrectionEntity();
                corr.Was = this.selectedText;
                corr.Correction = changedText;
                corr.Url = location.toString();

                if (this.anchorNode != null) {
                    corr.Context = this.anchorNode.textContent.substr(0, 140);
                }
                
                this.Hide();
                this.closeCallback(corr);
            }
        }

        public Hide() {
            if (this.editor.getAttribute("data-open") !== null) {
                this.editor.removeAttribute("data-open");
            }
        }

        private ShowDialog(topOffset: number) {
            this.editor.style.top = topOffset + "px";

            if (this.editor.getAttribute("data-open") === null) {
                this.editor.setAttribute("data-open", "open");
            }
        }

        private SetDialogData() {
            var misstake = document.getElementById("crowdspell-misstake");
            var correction = this.correctionInput;

            misstake.innerHTML = this.selectedText;
            correction.value = this.selectedText;
        }
    }

    interface ClickCallback {
        (ev: MouseEvent): void;
    }

    class Resources {
        EditorHtml: string;
        BubbleHtml: string;

        constructor() {
            this.ConstructEdiotrHtml();
            this.ConstructButtonHtml();
        }

        GetElement(html: string): HTMLElement {
            var div = document.createElement('div');
            div.innerHTML = html;
            return <HTMLElement> div.firstElementChild;
        }

        ActivateElement(element: HTMLElement) {
            var root = document.getElementById("crowdspell");
            root.parentNode.insertBefore(element, root);
        }

        ActivateHtml(html: string) {
            var el = this.GetElement(html);
            this.ActivateElement(el);
            return el;
        }

        ActivateEditor(): HTMLElement {
            return this.ActivateHtml(this.EditorHtml);
        }

        ActivateBubble(): HTMLElement {
            return this.ActivateHtml(this.BubbleHtml);
        }

        ConstructEdiotrHtml() {
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
        }

        ConstructButtonHtml() {
            var strVar = "";
            strVar += "    <div id=\"crowdspell-button-wrapper\" class=\"text-options\" style=\"top: -5px; left: 0px;\">";
            strVar += "        <div class=\"options\">";
            strVar += "            <a href=\"#\" id=\"crowdspell-button\" class=\"crowdspell-button\">Correct typo<\/a>";
            strVar += "        <\/div>";
            strVar += "    <\/div>";

            this.BubbleHtml = strVar;
        }

    }

    var StaticResources = new Resources();
    var _crowdSpell = new CrowdSpellApp();
}
