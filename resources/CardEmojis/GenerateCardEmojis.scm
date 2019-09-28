;Basic scheme/gimp2script-fu based script that iterates over every card suite and value to "generate"
;and export a png for each card. The png's are exported into the directory of the CardEmojiTemplate.xcf
;image file, following the naming convection "[card value][card suite].png"/"[2-10AJQK][SCHD].png".
;The layer id's are retrieved based on layer names. If you change the original layer names be
;sure to update the corresponding strings containing the original names in the variable definitions.
;The image used for generation is the (first open) image in gimp, so this script schould be run with
;only CardEmojiTemplate.xcf open.

;Sets all suite layers as invisible except for the specified layer.
(define (setLayerVisible layer)
	(gimp-layer-set-visible spadeLayer FALSE)
	(gimp-layer-set-visible clubLayer FALSE)
	(gimp-layer-set-visible diamondLayer FALSE)
	(gimp-layer-set-visible heartLayer FALSE)
	(if (> layer -1) (gimp-layer-set-visible layer TRUE))
)

;Returns the directory of the image imageId.
(define (getDirectory)
	(define index (firstSlash (reverse (string->list (car (gimp-image-get-filename imageId))))))
	(substring (car (gimp-image-get-filename imageId)) 0 index) 
)

;Returns the index of the first \ character in the given character list through recursion. 
(define (firstSlash charList)
	(if (char=? (list-ref charList 0) #\\)
		(length charList)
		(firstSlash (list-tail charList 1))
	)
)

;Recursive function used to loop through the card values.
(define (valueLoop j suiteValue)
	(define cardValue (number->string j))
	(cond
		((= j 1) (set! cardValue "A"))
		((= j 11) (set! cardValue "J"))
		((= j 12) (set! cardValue "Q"))
		((= j 13) (set! cardValue "K"))
	)
	(gimp-text-layer-set-text valueTextLayer cardValue)
	(define filename (string-append directory cardValue suiteValue ".png"))
	;(display (string-append filename "\n"))
	(file-png-save2 1 imageId overallGroupLayer filename filename 0 9 0 0 0 0 0 0 1)
	(if (< j 13) (valueLoop (+ j 1) suiteValue))
)

;Recursive function used to loop through the card suites. 
(define (suiteLoop i)
        (define j 1)
        (define suiteValue "-")
	(cond
		((= i 0) (gimp-text-layer-set-color valueTextLayer '(0 0 0)) (setLayerVisible spadeLayer) (set! suiteValue "S"))
		((= i 1) (gimp-text-layer-set-color valueTextLayer '(0 0 0)) (setLayerVisible clubLayer) (set! suiteValue "C"))
		((= i 2) (gimp-text-layer-set-color valueTextLayer '(255 0 0)) (setLayerVisible diamondLayer) (set! suiteValue "D"))
		((= i 3) (gimp-text-layer-set-color valueTextLayer '(255 0 0)) (setLayerVisible heartLayer) (set! suiteValue "H"))
	)
	(valueLoop j suiteValue)
        (if (< i 3) (suiteLoop (+ i 1)))
)

;Global variables
(define imageId (vector-ref (cadr (gimp-image-list)) 0))
(define overallGroupLayer (car (gimp-image-get-layer-by-name imageId "OverallLayerGroup")))
(define valueTextLayer (car (gimp-image-get-layer-by-name imageId "ValueText")))
(define spadeLayer (car (gimp-image-get-layer-by-name imageId "SpadeLayer")))
(define clubLayer (car (gimp-image-get-layer-by-name imageId "ClubLayer")))
(define diamondLayer (car (gimp-image-get-layer-by-name imageId "DiamondLayer")))
(define heartLayer (car (gimp-image-get-layer-by-name imageId "HeartLayer")))
(define directory (getDirectory))

;Starts iteration.
(suiteLoop 0)