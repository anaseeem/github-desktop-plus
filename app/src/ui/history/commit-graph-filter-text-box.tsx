import * as React from 'react'
import { FancyTextBox, IFancyTextBoxProps } from '../lib/fancy-text-box'
import { TextBox } from '../lib/text-box'
import classNames from 'classnames'
import { TAuthorFilterOption } from '../../lib/app-state'

interface ICommitGraphFilterTextBoxProps
  extends Omit<IFancyTextBoxProps, 'value' | 'onValueChanged'> {
  readonly authorFilterOptions: ReadonlyArray<TAuthorFilterOption> | null
  readonly onSearchSubmitted: (text: string, emailSet: Set<string>) => void
}

interface ICommitGraphFilterTextBoxState {
  readonly value: string
}

export class CommitGraphFilterTextBox extends React.Component<
  ICommitGraphFilterTextBoxProps,
  ICommitGraphFilterTextBoxState
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

  public constructor(props: ICommitGraphFilterTextBoxProps) {
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
        className={classNames('commitGraph-filter-text-box', {
          'with-clear-button': hasClearButton,
        })}
      >
        <div
          className="commitGraph-filter-text-box-backdrop"
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
          onEnterPressed={this.onEnterPressed}
          onRef={this.onTextBoxRef}
        />
      </div>
    )
  }

  private onValueChanged = (text: string) => {
    this.setState({
      value: text,
    })

    if (text === '') {
      this.submitSearch('')
    }
  }

  private onEnterPressed = (text: string) => {
    this.submitSearch(text)
  }

  private submitSearch = (text: string) => {
    const { query, validEmailSet } = parseSearchQuery(text, this.authorEmailSet)

    this.props.onSearchSubmitted(query, validEmailSet)
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
  const segments = text.split(/(\s+)/).filter(s => s.length > 0)

  return segments.map((segment, i) => {
    const match = /^author:(\S+)$/.exec(segment)

    if (match === null) {
      return <span key={i}>{segment}</span>
    }

    const validEmail = optionSet.has(match[1].toLowerCase())

    const isUserTyping = i < segments.length - 1

    const valueClassName = validEmail
      ? 'token-value'
      : isUserTyping
      ? 'token-value-invalid'
      : 'token-value-pending'

    return (
      <span key={i}>
        <span className="token">author:</span>
        <span className={valueClassName}>{match[1]}</span>
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
