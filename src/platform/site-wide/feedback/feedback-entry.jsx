/**
 * This application creates a widget for providing feedback on Vets.gov
 * 
 * @module platform/site-wide/feedback
 */

import React from 'react';
import { Provider } from 'react-redux';
import Main from './containers/Main';
import startReactApp from '../../startup/react';

/**
 * Sets up the feedback widget with the given store at feedback-root
 *
 * @param {Redux.Store} store The common store used on the site
 */
export default function createFeedbackWidget(store) {
  const feedbackRoot = document.getElementById('feedback-root');
  if (!feedbackRoot) return;

  startReactApp((
    <Provider store={store}>
      <Main/>
    </Provider>
  ), feedbackRoot);
}
