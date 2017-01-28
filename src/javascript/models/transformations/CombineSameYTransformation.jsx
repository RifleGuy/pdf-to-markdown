import Transformation from './Transformation.jsx';
import TextItem from '../TextItem.jsx';
import PdfPage from '../PdfPage.jsx';
import ContentView from '../ContentView.jsx';
import Annotation from '../Annotation.jsx';

function combineTextItems(textItems:TextItem[]) {
    var numChars = 0;
    var sumWidth = 0;
    var maxHeight = 0;
    textItems.forEach(textItem => {
        if (textItem.width > 0) {
            numChars += textItem.text.length;
            sumWidth += textItem.width;
        }
        maxHeight = Math.max(textItem.height, maxHeight);
    });
    const avgCharacterWidth = Math.round(sumWidth / numChars);

    var combinedText = '';
    var sumWidthWithWhitespaces = sumWidth;
    var lastItemX;
    var lastItemWidth;
    textItems.forEach(textItem => {
        if (lastItemX && textItem.x - lastItemX - lastItemWidth > avgCharacterWidth) {
            combinedText += ' ';
            sumWidthWithWhitespaces += avgCharacterWidth;
        }
        combinedText += textItem.text;
        lastItemX = textItem.x;
        lastItemWidth = textItem.width > 0 ? textItem.width : avgCharacterWidth / 2 * textItem.text.length;
    });

    return new TextItem({
        x: textItems[0].x,
        y: textItems[0].y,
        width: sumWidthWithWhitespaces,
        height: maxHeight,
        text: combinedText,
        annotation: new Annotation({
            category: 'combined',
            color: 'green'
        })

    });
}

export default class CombineSameYTransformation extends Transformation {

    constructor() {
        super("Combine Text On Same Y");
    }

    contentView() {
        return ContentView.PDF;
    }

    transform(pages:PdfPage[]) {

        const removedAnnotation = new Annotation({
            category: 'removed',
            color: 'red'
        });

        return pages.map(pdfPage => {
            const newTextItems = [];
            var textItemsWithSameY = [];

            var completeTextItemsWithSameY = function(textItemsWithSameY) {
                if (textItemsWithSameY.length == 1) {
                    newTextItems.push(textItemsWithSameY[0]);
                } else {
                    // add removed text-items
                    textItemsWithSameY.forEach(textItem => {
                        textItem.annotation = removedAnnotation;
                        newTextItems.push(textItem);
                    });
                    newTextItems.push(combineTextItems(textItemsWithSameY));
                }
            }

            pdfPage.textItems.forEach(textItem => {
                if (textItemsWithSameY.length == 0 || textItem.y == textItemsWithSameY[textItemsWithSameY.length - 1].y) {
                    //fill array
                    textItemsWithSameY.push(textItem);
                } else {
                    //rotate
                    completeTextItemsWithSameY(textItemsWithSameY);
                    textItemsWithSameY = [textItem];
                }
            });
            if (textItemsWithSameY.length > 0) {
                completeTextItemsWithSameY(textItemsWithSameY);
            }

            return {
                ...pdfPage,
                textItems: newTextItems
            };
        });
    }

    processAnnotations(pages:PdfPage[]) {
        pages.forEach(page => {
            page.textItems = page.textItems.filter(textItem => !textItem.annotation || textItem.annotation.category !== 'removed');
            page.textItems.forEach(textItem => textItem.annotation = null)
        });
        return pages;
    }

}