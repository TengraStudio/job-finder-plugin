declare module 'pdfjs-dist' {
    interface TextItemLike {
        str?: string;
    }

    interface TextContentLike {
        items: TextItemLike[];
    }

    interface PdfPageLike {
        getTextContent(): Promise<TextContentLike>;
    }

    interface PdfDocumentLike {
        numPages: number;
        getPage(pageNumber: number): Promise<PdfPageLike>;
    }

    interface PdfLoadingTaskLike {
        promise: Promise<PdfDocumentLike>;
    }

    export function getDocument(input: { data: Uint8Array }): PdfLoadingTaskLike;
}
