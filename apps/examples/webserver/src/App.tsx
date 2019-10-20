import * as React from 'react';

// @ts-ignore
import logo from './logo.svg';
import './Appcss.css';
import { useState } from 'react';
import { library2 } from '@apployees-nx/examples/library2';


function App() {

  const initialDynamicLibraryText = 'Dynamic library loading...please wait!';
  const [dynamicLibraryText, setDynamicLibraryText] = useState(initialDynamicLibraryText);

  const onClick = (event: React.MouseEvent) => {
    event.preventDefault();
    if (dynamicLibraryText === initialDynamicLibraryText) {
      // lazy loaded library
      import('@apployees-nx/examples/library1')
        .then(library1 => {
          setDynamicLibraryText(library1.library1());
        });
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo"/>
        <p>
          Edit <code>src/App.js</code> and save to reload!!
        </p>
        <p>
          {library2()}
        </p>
        {dynamicLibraryText !== initialDynamicLibraryText &&
        <p>
          {dynamicLibraryText}
        </p>
        }
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
        {dynamicLibraryText === initialDynamicLibraryText &&
        <button onClick={onClick}>
          Load a dynamic library.
        </button>
        }
      </header>
    </div>
  );
}

export default App;
