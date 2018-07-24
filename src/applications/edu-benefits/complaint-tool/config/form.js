// import fullSchema from 'vets-json-schema/dist/686-schema.json';

import IntroductionPage from '../containers/IntroductionPage';
import ConfirmationPage from '../containers/ConfirmationPage';
import SchoolSelectField from '../../components/SchoolSelectField.jsx';
import {
  fetchInstitutions,
  transformInstitutionsForSchoolSelectField
} from '../helpers';

// const { } = fullSchema.properties;

// const { } = fullSchema.definitions;

const formConfig = {
  urlPrefix: '/',
  submitUrl: '/v0/api',
  trackingPrefix: 'complaint-tool',
  introduction: IntroductionPage,
  confirmation: ConfirmationPage,
  formId: '686',
  version: 0,
  prefillEnabled: true,
  savedFormMessages: {
    notFound: 'Please start over to apply for declaration of status of dependents.',
    noAuth: 'Please sign in again to continue your application for declaration of status of dependents.'
  },
  title: 'Opt Out of Sharing VA Education Benefits Information',
  defaultDefinitions: {
  },
  chapters: {
    form: {
      title: 'Form',
      pages: {
        page1: {
          path: 'form-page',
          title: 'First Page',
          uiSchema: {
            school: {
              'ui:field': SchoolSelectField,
              'ui:options': {
                schoolSelect: {
                  fetchInstitutions: ({ institutionQuery, url }) => fetchInstitutions({ institutionQuery, url })
                    .then(({ error, payload }) => transformInstitutionsForSchoolSelectField({ error, institutionQuery, payload })),
                  okay: 'test'
                }
              }
            },
            /*
            name: _.merge(autoSuggestUiSchema(
              'Search for some schools',
              value => fetchAutocompleteSuggestions(value)
                .then(transformAutocompletePayloadForAutosuggestField),
              {
                'ui:options': {
                  queryForResults: true,
                  freeInput: true,
                  debounceRate: 250,
                  listLabel: 'Select one of options or submit to search'
                },
                'ui:errorMessages': {
                  // If the maxLength changes, we'll want to update the message too
                  maxLength: 'Please enter a name with fewer than 100 characters.',
                  pattern: 'Please enter a valid name.'
                }
              }
            ), {
              'ui:field': AutosuggestField
            })
            */
                },
          schema: {
            type: 'object',
            properties: {
              school: {
                type: 'string'
              }
            }
          }
        }
      }
    }
  }
};

export default formConfig;
