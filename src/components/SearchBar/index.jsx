import { createRef, Component } from 'react';
import { bool, func, number } from 'prop-types';
import hotkeys from 'hotkeys-js';
import FilterLinesIcon from './FilterLinesIcon';
import { SEARCH_MIN_KEYWORDS } from '../../utils';
import {
  searchBar,
  searchInput,
  button,
  active,
  inactive,
} from './index.module.css';

export default class SearchBar extends Component {
  static propTypes = {
    /**
     * Executes a function when the user starts typing.
     */
    onSearch: func,
    /**
     * Executes a function when the search input has been cleared.
     */
    onClearSearch: func,
    /**
     * Executes a function when the option `Filter Lines With Matches`
     * is enable.
     */
    onFilterLinesWithMatches: func,
    /**
     * Number of search results. Should come from the component
     * executing the search algorithm.
     */
    resultsCount: number,
    /**
     * If true, then only lines that match the search term will be displayed.
     */
    filterActive: bool,
    /**
     * If true, the input field and filter button will be disabled.
     */
    disabled: bool,
    /**
     * If true, capture system hotkeys for searching the page (Cmd-F, Ctrl-F,
     * etc.)
     */
    captureHotKeys: bool,
    /**
     * Exectues a function when enter is pressed.
     */
    onEnter: func,
    /**
     * Exectues a function when shift + enter is pressed.
     */
    onShiftEnter: func,
  };

  static defaultProps = {
    onSearch: () => {},
    onClearSearch: () => {},
    onFilterLinesWithMatches: () => {},
    resultsCount: 0,
    filterActive: false,
    disabled: false,
    captureHotKeys: false,
  };

  state = {
    keywords: '',
  };

  constructor(props) {
    super(props);
    this.inputRef = createRef();
  }

  handleSearchChange = e => {
    const { value: keywords } = e.target;

    this.setState({ keywords }, () => this.search());
  };

  handleFilterToggle = () => {
    this.props.onFilterLinesWithMatches(!this.props.filterActive);
  };

  handleKeyPress = e => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        this.props.onShiftEnter();
      } else {
        this.props.onEnter();
      }
    }
  };

  handleSearchHotkey = e => {
    if (!this.inputRef.current) {
      return;
    }

    e.preventDefault();
    this.inputRef.current.focus();
  };

  search = () => {
    const { keywords } = this.state;
    const { onSearch, onClearSearch } = this.props;

    if (keywords && keywords.length > SEARCH_MIN_KEYWORDS) {
      onSearch(keywords);
    } else {
      onClearSearch();
    }
  };

  componentDidMount() {
    if (this.props.captureHotKeys) {
      hotkeys('ctrl+f,command+f', this.handleSearchHotkey);
      hotkeys.filter = () => true;
    }
  }

  render() {
    const { resultsCount, filterActive, disabled } = this.props;
    const matchesLabel = `match${resultsCount === 1 ? '' : 'es'}`;
    const filterIcon = filterActive ? active : inactive;

    return (
      <div className={`react-lazylog-searchbar ${searchBar}`}>
        <input
          autoComplete="off"
          type="text"
          name="search"
          placeholder="Search"
          className={`react-lazylog-searchbar-input ${searchInput}`}
          onChange={this.handleSearchChange}
          onKeyPress={this.handleKeyPress}
          value={this.state.keywords}
          disabled={disabled}
          ref={this.inputRef}
        />
        <button
          disabled={disabled}
          className={`react-lazylog-searchbar-filter ${
            filterActive ? 'active' : 'inactive'
          } ${button} ${filterIcon}`}
          onKeyPress={this.handleKeyPress}
          onMouseUp={this.handleFilterToggle}>
          <FilterLinesIcon />
        </button>
        <span
          className={`react-lazylog-searchbar-matches ${
            resultsCount ? 'active' : 'inactive'
          } ${resultsCount ? active : inactive}`}>
          {resultsCount} {matchesLabel}
        </span>
      </div>
    );
  }
}
