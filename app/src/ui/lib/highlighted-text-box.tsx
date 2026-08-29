import * as React from 'react'
import { FancyTextBox, IFancyTextBoxProps } from './fancy-text-box'
import { TextBox } from './text-box'
import classNames from 'classnames'
import { TAuthorFilterOption } from '../../lib/app-state'

interface IHighlightedTextBoxProps
  extends Omit<IFancyTextBoxProps, 'value' | 'onValueChanged'> {
  readonly authorFilterOptions: ReadonlyArray<TAuthorFilterOption> | null
  readonly onParsedValueChanged: (text: string, emailSet: Set<string>) => void
}

interface IHighlightedTextBoxState {
  readonly value: string
}

export class HighlightedTextBox extends React.Component<
  IHighlightedTextBoxProps,
  IHighlightedTextBoxState
> {
  private backdropRef = React.createRef<HTMLDivElement>()
  private inputElement: HTMLInputElement | null = null

  private get authorEmailSet() {
    return new Set(
      (this.props.authorFilterOptions ?? []).map(a =>
        a.email.trim().toLowerCase()
      )
    )
  }

  public constructor(props: IHighlightedTextBoxProps) {
    super(props)

    this.state = { value: '' }
  }

  public componentWillUnmount() {
    this.detachScrollListener()
  }

  public componentDidUpdate() {
    this.syncBackdropScroll()
  }

  public render() {
    const value = this.state.value

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
          {renderSegments(value, this.authorEmailSet)}
        </div>
        <FancyTextBox
          ariaLabel={this.props.ariaLabel}
          type={this.props.type}
          symbol={this.props.symbol}
          symbolClassName={this.props.symbolClassName}
          placeholder={this.props.placeholder}
          value={this.state.value}
          onValueChanged={this.onValueChanged}
          onRef={this.onTextBoxRef}
        />
      </div>
    )
  }

  private onValueChanged = (text: string) => {
    this.setState({
      value: text,
    })

    const { query, validEmailSet } = parseSearchQuery(text, this.authorEmailSet)

    this.props.onParsedValueChanged(query, validEmailSet)
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

function renderSegments(text: string, optionSet: ReadonlySet<string>) {
  return text
    .split(/(\s+)/)
    .filter(s => s.length > 0)
    .map((segment, i) => {
      const match = /^author:(\S+)$/.exec(segment)

      if (match === null) {
        return <span key={i}>{segment}</span>
      }

      const validEmail = optionSet.has(match[1].toLowerCase())

      return (
        <span key={i}>
          <span className="token">author:</span>
          <span
            className={`${validEmail ? 'token-value' : 'token-value-invalid'}`}
          >
            {match[1]}
          </span>
        </span>
      )
    })
}

function parseSearchQuery(
  searchQuery: string,
  authorEmailSet: ReadonlySet<string>
) {
  const validEmailSet = new Set<string>()
  const query = searchQuery
    .replace(/(?:^|\s)author:(\S+)/g, (_match, email: string) => {
      if (authorEmailSet.has(email.toLowerCase())) {
        validEmailSet.add(email.toLowerCase())
      }
      return ' '
    })
    .replace(/\s+/g, ' ')
    .trim()

  return { validEmailSet, query }
}
