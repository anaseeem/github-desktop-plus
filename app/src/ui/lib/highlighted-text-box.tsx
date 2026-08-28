import * as React from 'react'
import { FancyTextBox, IFancyTextBoxProps } from './fancy-text-box'
import { TextBox } from './text-box'
import classNames from 'classnames'

export class HighlightedTextBox extends React.Component<IFancyTextBoxProps> {
  private backdropRef = React.createRef<HTMLDivElement>()
  private inputElement: HTMLInputElement | null = null

  public componentWillUnmount() {
    this.detachScrollListener()
  }

  public componentDidUpdate() {
    // The input may have adjusted its scroll position after a value
    // change (e.g. clamping when text got shorter) - make sure the
    // backdrop still mirrors it.
    this.syncBackdropScroll()
  }

  public render() {
    const value = this.props.value ?? ''

    // A clear affordance takes over the right end of the input:
    // the native ✕ for type="search", or the custom clear button.
    const hasClearButton =
      value !== '' &&
      (this.props.type === 'search' || this.props.displayClearButton === true)

    return (
      <div
        className={classNames('highlighted-text-box', {
          'with-clear-button': hasClearButton,
        })}
      >
        <div
          className="highlighted-text-box-backdrop"
          aria-hidden="true"
          ref={this.backdropRef}
        >
          {commitGraph_renderSegments(value)}
          <span></span>
          <span></span>
        </div>
        <FancyTextBox {...this.props} onRef={this.onTextBoxRef} />
      </div>
    )
  }

  private onTextBoxRef = (textBox: TextBox | null) => {
    this.detachScrollListener()

    this.inputElement = textBox !== null ? textBox.getInputElement() : null

    if (this.inputElement !== null) {
      this.inputElement.addEventListener('scroll', this.syncBackdropScroll)
    }

    if (this.props.onRef && textBox !== null) {
      this.props.onRef(textBox)
    }
  }

  private detachScrollListener() {
    if (this.inputElement !== null) {
      this.inputElement.removeEventListener('scroll', this.syncBackdropScroll)
      this.inputElement = null
    }
  }

  private syncBackdropScroll = () => {
    const backdrop = this.backdropRef.current

    if (backdrop === null || this.inputElement === null) {
      return
    }

    backdrop.scrollLeft = this.inputElement.scrollLeft
  }
}

function commitGraph_renderSegments(value: string) {
  // split on whitespace but KEEP the whitespace segments (needed for spacing)
  return value
    .split(/(\s+)/)
    .filter(s => s.length > 0)
    .map((segment, i) => {
      const match = /^author:(\S+)$/.exec(segment)

      if (match === null) {
        return <span key={i}>{segment}</span>
      }

      return (
        <span key={i}>
          <span className="token">author:</span>
          <span className="token-value">{match[1]}</span>
        </span>
      )
    })
}
