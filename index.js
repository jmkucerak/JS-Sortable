/**
 * Sortable Constructor.
 * 
 * @param {HTMLElement} element - The Sortable container.
 * @param {Object}      options
 */
function sortable(element, options) {
    // Validate element value; log if debugging
    if (!(element instanceof HTMLElement)) {
        throw new Error('Value of the `element` parameter must be a single valid HTMLElement')
    }

    // Element is valid so store it.
    this.element = element

    // If the options parameter has a value, validate.
    if (Object.prototype.toString.call(options) === '[object Object]') {
        // Combine the given options with the default.
        this.options = Object.assign(
            {
                panel: null,
                drag: null,
                sortStart: null,
                sortChange: null,
                sortEnd: null
            },
            options
        )
    } else if (undefined !== options) {
        throw new Error('The options parameter requires an Object to be passed.')
    }

    // Instantiate variable to reference current sort item.
    let panelActive = null
    /**
     * Reference to all sortable panels, element the cursor is currently
     * over and the relative position of the cursor to the selected sortable.
     */
    let panels, panelOver, mouseOffset
    // Reference to placeholder element showing where a sortable will be placed.
    let shadow = {
        element: null,
        position: null
    }

    this.init = () => {
        // Bootstrap default behavior
        if (undefined === options) {
            // @todo Define default behavior
        } else {
            if (this.options.panel === null || this.options.drag === null) {
                throw new Error('Please supply options for panel and drag.')
            }

            // Store all panel elements.
            let panelElements = this.element.getElementsByClassName(
                this.options.panel.class
            )

            // Validate panel elements
            if (0 === panelElements.length) {
                throw new Error('Unable to find any HTMLElements assigned the panel.class Options value: ' + this.options.panel.class)
            }

            // Save panel element references and element meta to a new variable.
            panels = Array.from(panelElements)

            // Store all drag elements.
            let dragHandles = this.element.getElementsByClassName(
                this.options.drag.class
            )

            // Validate panel elements
            if (0 === dragHandles.length) {
                throw new Error('Unable to find any HTMLElements assigned the drag.class Options value: ' + this.options.panel.class)
            }

            // Validate number of panel and drag elements are equal.
            if (panels.length !== dragHandles.length) {
                console.warn('The number of panel elements does not match the number of drag elements.  This may lead to unexpected behavior.  Panel element count: ' + panels.length + ' | Drag element count: ' + dragHandles.length
                )
            }

            // Only track mouse movement over the sortable container.
            this.element.addEventListener('mousemove', e => {
                e.preventDefault()
                this.handleMouseMove(e.pageY)
            })

            // The mouse up event will be captured regardless of 
            // where it happens in the document.
            document.addEventListener('mouseup', e => {
                e.preventDefault()
                this.handleMouseUp()
            })

            // Attach event listeners to each drag element and
            // each panel element.
            for (let i = 0; i < dragHandles.length; i++) {
                dragHandles[i].addEventListener('mousedown', e => {
                    e.preventDefault()
                    this.handleMouseDown(i, { x: e.clientX, y: e.pageY })
                })

                panels[i].addEventListener('mouseenter', e => {
                    e.preventDefault()
                    // Only process if sorting.
                    if (panelActive) {
                        // Store reference and meta of element under the cursor.
                        panelOver = {
                            element: e.target,
                            middle: e.target.offsetTop + (e.target.offsetHeight / 2),
                            position: Array.from(this.element.getElementsByClassName('panel')).indexOf(e.target)
                        }
                    }
                })

                panels[i].addEventListener('mouseleave', e => {
                    e.preventDefault()
                    // Only process if sorting.
                    if (panelActive) {
                        panelOver = null
                    }
                })
            }
        }
    }

    this.handleMouseDown = function (index, mouse) {
        // Set active panel to the corresponding panel of the 
        // selected drag element.
        panelActive = panels[index]

        // Store height and width of panelActive
        let height = window.getComputedStyle(panelActive, null).getPropertyValue('height')
        let width = window.getComputedStyle(panelActive, null).getPropertyValue('width')

        // Store offset between top of active panel and mouse position.
        // This prevents the panel position from 'jumping' to the cursor.
        mouseOffset = mouse.y - panelActive.offsetTop

        // Modify properties of the panelActive to allow for seamless
        // dragging.
        panelActive.classList.add(this.options.panel.classSorting)
        panelActive.style.width = width
        panelActive.style.height = height
        panelActive.style.pointerEvents = 'none'
        panelActive.style.top = mouse.y - mouseOffset + 'px'

        // Generate and insert a 'shadow' to indicate where the
        // panelActive will be placed when the mouse is released.
        // This will be updated upon mouse movement.
        let shadowNode = document.createElement(panelActive.localName)
        shadowNode.classList.add(this.options.panel.classShadow)
        shadowNode.classList.add(this.options.panel.class)
        shadowNode.style.height = height
        shadow.element = this.element.insertBefore(shadowNode, panelActive)

        // This is done so that the position of the shadow
        // can be monitored more easily.
        this.element.append(panelActive)

        // Store initial position of shadow on sort start.
        shadow.position = Array.from(this.element.getElementsByClassName('panel')).indexOf(shadow.element)

        // Hook into the start of sorting.
        if (this.options.sortStart) this.options.sortStart()
    }

    this.handleMouseUp = function () {
        // Process mouse up if there is an active panel.
        if (panelActive) {
            // Remove properties required for sorting.
            panelActive.style.removeProperty('top')
            panelActive.style.removeProperty('width')
            panelActive.style.removeProperty('height')
            panelActive.style.removeProperty('pointer-events')
            panelActive.classList.remove('sorting')

            // Reset mouse offset.
            mouseOffset = 0

            // Place the active panel before the shadow in the DOM.
            this.element.insertBefore(panelActive, shadow.element)

            // Reset the active panel and remove the shadow.
            panelActive = null
            shadow.element.remove()

            // Hook into the end of sorting.
            if (this.options.sortEnd) this.options.sortEnd()
        }
    }

    this.handleMouseMove = function (mouseY) {
        // Process only if sorting.
        if (panelActive) {
            // Set new Top position of active panel.
            panelActive.style.top = mouseY - mouseOffset + 'px'
            // Process only if over another panel.
            if (panelOver !== null) {
                // Tests if cursor is above or below the midline of the
                // panel that it is over.
                if (mouseY < panelOver.middle) {  // below midline
                    // Process if the Panel the cursor is over is not the bottom.
                    if (shadow.position + 1 !== panelOver.position) {
                        // Insert the shadow into the DOM
                        this.element.insertBefore(shadow.element, panelOver.element)
                    }
                } else { // above midline
                    // Process if the Panel the cursor is over is not the top.
                    if (shadow.position - 1 !== panelOver.position) {
                        // Insert the shadow into the DOM
                        this.element.insertBefore(shadow.element, panelOver.element.nextSibling)
                    }
                }
                // Update positions of the shadow and Panel the cursor is over
                // to reflect DOM changes.
                panelOver.position = Array.from(this.element.getElementsByClassName('panel')).indexOf(panelOver.element)
                shadow.position = Array.from(this.element.getElementsByClassName('panel')).indexOf(shadow.element)

                // Recalculate midline of panel the cursor is over.
                // Fixes odd behavior when Sortable container has overflow.
                panelOver.middle = panelOver.element.offsetTop + (panelOver.element.offsetHeight / 2)
            }
        }
    }
}