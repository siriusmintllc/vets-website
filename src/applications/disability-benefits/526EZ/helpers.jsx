import React from 'react';
import moment from 'moment';

import AlertBox from '@department-of-veterans-affairs/formation/AlertBox';
import AdditionalInfo from '@department-of-veterans-affairs/formation/AdditionalInfo';
import Raven from 'raven-js';
import appendQuery from 'append-query';

import { isValidUSZipCode, isValidCanPostalCode } from '../../../platform/forms/address';
import { stateRequiredCountries } from '../../common/schemaform/definitions/address';
import { transformForSubmit } from '../../common/schemaform/helpers';
import cloneDeep from '../../../platform/utilities/data/cloneDeep';
import get from '../../../platform/utilities/data/get';
import set from '../../../platform/utilities/data/set';
import { genderLabels } from '../../../platform/static-data/labels';
import { getDiagnosticCodeName } from './reference-helpers';

const siblings = ['treatments', 'privateRecordReleases', 'privateRecords', 'additionalDocuments'];

import { PREFILL_STATUSES } from '../../common/schemaform/save-in-progress/actions';
import { DateWidget } from '../../common/schemaform/review/widgets';

const vaForm4142URL = 'https://www.vba.va.gov/pubs/forms/VBA-21-4142-ARE.pdf';

import { prestartFailureStatuses, prestartSuccessStatuses, PRESTART_STATUSES } from './actions';

const { created, retrieved, renewed, notRetrievedNew, notRetrievedSaved, notCreated, notRenewed } = PRESTART_STATUSES;
/*
 * Flatten nested array form data into sibling properties
 *
 * @param {object} data - Form data for a full form, including nested array properties
 */
export function flatten(data) {
  const formData = cloneDeep(data);
  formData.disabilities.forEach((disability, idx) => {
    siblings.forEach(sibling => {
      if (disability[sibling]) {
        formData[sibling] = [];
        formData[sibling][idx] = disability[sibling];
        delete disability[sibling]; // eslint-disable-line no-param-reassign
      }
    });
  });
  return formData;
}


export function transform(formConfig, form) {
  const formData = flatten(transformForSubmit(formConfig, form));
  delete formData.prefilled;
  return JSON.stringify({
    disabilityBenefitsClaim: {
      form: formData
    }
  });
}


export const isPrefillDataComplete = (formData) => {
  const { socialSecurityNumber, vaFileNumber, gender,
    dateOfBirth, servicePeriods } = formData;
  const first = get('fullName.first', formData);
  const last = get('fullName.last', formData);
  const country = get('veteran.mailingAddress.country', formData);
  const addressLine1 = get('veteran.mailingAddress.addressLine1', formData);
  const emailAddress = get('veteran.emailAddress', formData);
  const primaryPhone = get('veteran.primaryPhone', formData);
  const accountType = get('directDeposit.accountType', formData);
  const routingNumber = get('directDeposit.routingNumber', formData);
  const bankName = get('directDeposit.bankName', formData);
  const noBank = get('directDeposit.noBank', formData);
  const hasVeteranDetails = first && last && gender && dateOfBirth && (socialSecurityNumber || vaFileNumber);
  const hasPrimaryAddressInfo = country && addressLine1 && emailAddress && primaryPhone;
  const hasPaymentInfo = noBank || (accountType && routingNumber && bankName);
  const hasMilitaryHistoryInfo = servicePeriods && servicePeriods.length > 0;
  return !!(hasVeteranDetails && hasPrimaryAddressInfo && hasPaymentInfo && hasMilitaryHistoryInfo);
};


export function prefillTransformer(pages, formData, metadata, state) {
  let newData = formData;
  const isPrefilled = state.prefilStatus === PREFILL_STATUSES.success;
  const hasRequiredInformation = isPrefillDataComplete(formData);

  if (isPrefilled && hasRequiredInformation) {
    newData = set('prefilled', true, newData);
  }

  return {
    metadata,
    formData: newData,
    pages
  };
}


export const supportingEvidenceOrientation = (
  <p>
    On the next few screens, we’ll ask you where we can find medical records or
    supporting evidence that show your rated condition has gotten worse. You don’t
    need to turn in any medical records that you already submitted with your original
    claim. <strong>We only need new medical records or evidence that show your rated
    condition has gotten worse.</strong>
  </p>
);

export const evidenceTypeHelp = (
  <AdditionalInfo triggerText="Which evidence type should I choose?">
    <h3>Types of evidence</h3>
    <h4>VA medical records</h4>
    <p>If you were treated at a VA medical center or clinic, or by a doctor through the TRICARE health care program, you’ll have VA medical records.</p>
    <h4>Private medical records</h4>
    <p>If you were treated by a private doctor, including a Veteran’s Choice doctor, you’ll have private medical records.
      We’ll need to see those records to make a decision on your claim. A Disability Benefit Questionnaire is an example of a private medical record.</p>
    <h4>Lay statements or other evidence</h4>
    <p>A lay statement is a written statement from family, friends, or coworkers to help support your claim. Lay statements are also called “buddy statements.” In most cases, you’ll only need your medical records to support your disability claim. Some claims, for example, for Posttraumatic Stress Disorder or for military sexual trauma, could benefit from a lay or buddy statement.</p>
  </AdditionalInfo>
);


export const disabilityNameTitle = ({ formData }) => {
  return (
    <legend className="schemaform-block-title schemaform-title-underline">{getDiagnosticCodeName(formData.diagnosticCode)}</legend>
  );
};


export const facilityDescription = ({ formData }) => {
  return (
    <p>Please tell us where VA treated you for {getDiagnosticCodeName(formData.diagnosticCode)} <strong>after you got your disability rating</strong>.</p>
  );
};


export const treatmentView = ({ formData }) => {
  const { from, to } = formData.treatmentDateRange;

  const name = formData.treatmentCenterName || '';
  let treatmentPeriod = '';
  if (from && to) {
    treatmentPeriod = `${from} — ${to}`;
  } else if (from || to) {
    treatmentPeriod = `${(from || to)}`;
  }

  return (
    <div>
      <strong>{name}</strong><br/>
      {treatmentPeriod}
    </div>
  );
};


export const vaMedicalRecordsIntro = ({ formData }) => {
  return (
    <p>First we’ll ask you about your VA medical records that show your {getDiagnosticCodeName(formData.diagnosticCode)} has gotten worse.</p>
  );
};


export const privateRecordsChoice = ({ formData }) => {
  return (
    <div>
      <h4>About private medical records</h4>
      <p>
        You said you were treated for {getDiagnosticCodeName(formData.diagnosticCode)} by a private
        doctor. If you have your private medical records, you can upload them to your application.
        If you want us to get them for you, you’ll need to authorize their release.
      </p>
    </div>
  );
};


export const privateRecordsChoiceHelp = () => {
  return (
    <AdditionalInfo triggerText="Which should I choose?">
      <h4>You upload your medical records</h4>
      <p>
      If you upload a digital copy of all your medical records, we can review
      your claim more quickly. Uploading a digital file works best if you have
      a computer with a fast Internet connection. The digital file could be
      uploaded as a .pdf or other photo file format, like a .jpeg or .png.
      </p>
      <h4>We get your medical records for you</h4>
      <p>
      If you tell us which VA medical center treated you for your condition, we
      can get your medical records for you. Getting your records may take us some
      time, and this could mean that it’ll take us longer to make a decision on
      your claim. You’ll need to first fill out an Authorization to Disclose
      Information to the VA (VA Form 21-4142) so we can request your records.
      </p>
      <p>
        <a href={vaForm4142URL} target="_blank">
        Download VA Form 21-4142
        </a>.
      </p>
    </AdditionalInfo>
  );
};

const firstOrNowString = (evidenceTypes) => (evidenceTypes['view:vaMedicalRecords'] ? 'Now' : 'First,');

export const privateMedicalRecordsIntro = ({ formData }) => (
  <p>
    {firstOrNowString(formData['view:selectableEvidenceTypes'])} we’ll ask you about your private medical records that show your {getDiagnosticCodeName(formData.diagnosticCode)} has gotten worse.
  </p>
);

export function validatePostalCodes(errors, formData) {
  let isValidPostalCode = true;
  // Checks if postal code is valid
  if (formData.treatmentCenterCountry === 'USA') {
    isValidPostalCode = isValidPostalCode && isValidUSZipCode(formData.treatmentCenterPostalCode);
  }
  if (formData.treatmentCenterCountry === 'CAN') {
    isValidPostalCode = isValidPostalCode && isValidCanPostalCode(formData.treatmentCenterPostalCode);
  }

  // Add error message for postal code if it exists and is invalid
  if (formData.treatmentCenterPostalCode && !isValidPostalCode) {
    errors.treatmentCenterPostalCode.addError('Please provide a valid postal code');
  }
}

export function validateAddress(errors, formData) {
  // Adds error message for state if it is blank and one of the following countries:
  // USA, Canada, or Mexico
  if (stateRequiredCountries.has(formData.treatmentCenterCountry)
    && formData.treatmentCenterState === undefined) {
    // TODO: enable once validation determined
    // && currentSchema.required.length) {
    errors.treatmentCenterState.addError('Please select a state or province');
  }
  const hasAddressInfo = stateRequiredCountries.has(formData.treatmentCenterCountry)
    // TODO: enable once validation determined
    // && !currentSchema.required.length
    && typeof formData.treatmentCenterCity !== 'undefined'
    && typeof formData.treatmentCenterStreet !== 'undefined'
    && typeof formData.treatmentCenterPostalCode !== 'undefined';

  if (hasAddressInfo && typeof formData.treatmentCenterState === 'undefined') {
    errors.treatmentCenterState.addError('Please enter a state or province, or remove other address information.');
  }

  validatePostalCodes(errors, formData);
}

const claimsIntakeAddress = (
  <p className="va-address-block">
    Department of Veterans Affairs<br/>
    Claims Intake Center<br/>
    PO Box 4444<br/>
    Janesville, WI 53547-4444
  </p>
);

export const download4142Notice = (
  <div className="usa-alert usa-alert-warning no-background-image">
    <p>
      Since your doctor has your private medical records, you’ll need to fill
      out an Authorization to Disclose Information to the VA (VA Form 21-4142) so
      we can request your records. You’ll need to fill out a form for each doctor.
    </p>
    <p>
      <a href={vaForm4142URL} target="_blank">
        Download VA Form 21-4142
      </a>.
      <p>
        Please print the form, fill it out, and send it to:
      </p>
      {claimsIntakeAddress}
      <p>Or you can upload a completed VA Form 21-4142 to your online application.</p>
    </p>
  </div>
);

export const authorizationToDisclose = () => {
  return (
    <div>
      <p>Since your medical records are with your doctor, you’ll need to fill out an Authorization to Disclose
    Information to the VA (VA Form 21-4142) so we can request your records. You’ll need to fill out a form for
    each doctor.</p>
      <p>
        <a href={vaForm4142URL} target="_blank">
        Download VA Form 21-4142
        </a>.
      </p>
      <p>Please print the form, fill it out, and send it to:</p>
      {claimsIntakeAddress}
    </div>
  );
};

export const recordReleaseWarning = (
  <div className="usa-alert usa-alert-warning no-background-image">
    <span>Limiting consent means that your doctor can only share records that are
      directly related to your condition. This could add to the time it takes to
      get your private medical records.</span>
  </div>
);

export const documentDescription = () => {
  return (
    <div>
      <p>
        You can upload your document in a pdf, .jpeg, or .png file format. You’ll
        first need to scan a copy of your document onto your computer or mobile phone.
        You can then upload the document from there. Please note that large files can
        take longer to upload with a slow Internet connection. Guidelines for uploading
        a file:
      </p>
      <ul>
        <li>File types you can upload: .pdf, .jpeg, or .png</li>
        <li>Maximum file size: 50 MB</li>
      </ul>
      <p><em>Large files can be more difficult to upload with a slow Internet connection</em></p>
    </div>
  );
};

export const additionalDocumentDescription = () => {
  return (
    <div>
      <p>
        If you have other evidence, such as a lay or buddy statement to turn in,
        you can upload them here. You can upload your document in a pdf, .jpeg, or
        .png file format. You’ll first need to scan a copy of your document onto
        your computer or mobile phone. You can then upload the document from there.
        Please note that if you have a slow Internet connection, large files can
        take longer to upload.
      </p>
      <p>File upload guidelines:</p>
      <ul>
        <li>File types you can upload: .pdf, .jpeg, or .png</li>
        <li>Maximum file size: 50 MB</li>
      </ul>
      <p><em>Large files can be more difficult to upload with a slow Internet connection</em></p>
    </div>
  );
};

export const selectDisabilityDescription = () => {
  return (
    <p>Please choose the disability that you’re filing a claim for increase because the condition has gotten worse.</p>
  );
};

export const releaseDescription = () => {
  return (
    <p>Please let us know where and when you received treatment. We’ll request your private medical records for you. If you have your private medical records available, you can upload them later in the application</p>
  );
};

const getVACenterName = (center) => center.treatmentCenterName;

const getPrivateCenterName = (release) => release.privateRecordRelease.treatmentCenterName;

const listifyCenters = (center, idx, list) => {
  const centerName = center.treatmentCenterName ? getVACenterName(center) : getPrivateCenterName(center);
  const notLast = idx < (list.length - 1);
  const justOne = list.length === 1;
  const atLeastThree = list.length > 2;
  return (
    <span key={idx}>
      {!notLast && !justOne && <span className="unstyled-word"> and </span>}
      {centerName}
      {atLeastThree && notLast && ', '}
    </span>
  );
};

export const evidenceSummaryView = ({ formData }) => {
  const {
    vaTreatments,
    privateRecordReleases,
    privateRecords,
    additionalDocuments
  } = formData;
  return (
    <div>
      <ul>
        {vaTreatments &&
        <li>We’ll get your medical records from <span className="treatment-centers">{vaTreatments.map(listifyCenters)}</span>.</li>}
        {privateRecordReleases &&
        <li>We’ll get your private medical records from <span className="treatment-centers">{privateRecordReleases.map(listifyCenters)}</span>.</li>}
        {privateRecords && <li>We have received the private medical records you uploaded.</li>}
        {additionalDocuments &&
        <li>We have received the additional evidence you uploaded:
          <ul>
            {additionalDocuments.map((document, id) => {
              return (<li className="dashed-bullet" key={id}>
                <strong>{document.name}</strong>
              </li>);
            })
            }
          </ul>
        </li>}
      </ul>
    </div>
  );
};

/**
 * @param {ReactElement|ReactComponent|String} srIgnored -- Thing to be displayed visually,
 *                                                           but ignored by screen readers
 * @param {String} substitutionText -- Text for screen readers to say instead of srIgnored
 */
const srSubstitute = (srIgnored, substitutionText) => {
  return (
    <div style={{ display: 'inline' }}>
      <span aria-hidden>{srIgnored}</span>
      <span className="sr-only">{substitutionText}</span>
    </div>
  );
};

export const veteranInformationViewField = (data) => {
  const { ssn, vaFileNumber, dateOfBirth, gender } = data;
  const { first, middle, last, suffix } = data.fullName;
  const mask = srSubstitute('●●●–●●–', 'ending with');
  return (
    <div>
      <p>This is the personal information we have on file for you.</p>
      <div className="blue-bar-block">
        <strong>{first} {middle} {last} {suffix}</strong>
        <p>Social Security number: {mask}{ssn.slice(5)}</p>
        <p>VA file number: {mask}{vaFileNumber.slice(5)}</p>
        <p>Date of birth: <DateWidget value={dateOfBirth} options={{ monthYear: false }}/></p>
        <p>Gender: {genderLabels[gender]}</p>
      </div>
      <p><strong>Note:</strong> If something doesn’t look right and you need to update your details, please call Veterans Benefits Assistance at <a href="tel:1-800-827-1000">1-800-827-1000</a>, Monday – Friday, 8:00 a.m. to 9:00 p.m. (ET).</p>
    </div>
  );
};

/**
 * @typedef {Object} Disability
 * @property {String} diagnosticCode
 * @property {String} name
 * @property {String} ratingPercentage
 *
 * @param {Disability} disability
 */
export const disabilityOption = ({ diagnosticCode, ratingPercentage }) => {
  // May need to throw an error to Sentry if any of these doesn't exist
  // A valid rated disability *can* have a rating percentage of 0%
  const showRatingPercentage = Number.isInteger(ratingPercentage);

  return (
    <div>
      {diagnosticCode && <h4>{getDiagnosticCodeName(diagnosticCode)}</h4>}
      {showRatingPercentage && <p>Current rating: <strong>{ratingPercentage}%</strong></p>}
    </div>
  );
};

const prestartAlertHeadings = {
  [created]: 'Your Intent to File request has been submitted',
  [retrieved]: 'We found your existing Intent to File',
  [renewed]: 'Your Intent to File request has been submitted',
  [notRetrievedSaved]: 'Your Intent to File request didn’t go through',
  [notCreated]: 'We can’t process your Intent to File request',
  [notRenewed]: 'Your Intent to File request didn’t go through',
  [notRetrievedNew]: 'We’re sorry. Something went wrong on our end',
};

const prestartErrorMessages = {
  [notRetrievedSaved]: 'We’re sorry. Your Intent to File request didn’t go through because something went wrong on our end. Please try applying again tomorrow.',
  [notCreated]: 'We’re sorry. We can’t process your Intent to File request at this time. Please try applying again tomorrow.',
  [notRenewed]: 'We’re sorry. Your Intent to File request didn’t go through because something went wrong on our end. Please try applying again tomorrow.',
  [notRetrievedNew]: 'We can’t access your Intent to File request right now. Please try applying again tomorrow.',
};

function getPrestartSuccessMessage(status, data, expiredData) {
  const messages = {
    [created]: (expirationDateString) => `Thank you for submitting your Intent to File for disability compensation. Your Intent to File will expire on ${expirationDateString}.`,
    [retrieved]: (expirationDateString) => `Our records show that you already have an Intent to File for disability compensation. Your Intent to File will expire on ${expirationDateString}.`,
    [renewed]: (expirationDateString, expiredDateString) => `Your existing Intent to File expired on ${expiredDateString}, so we’ve created a new one for you. This new Intent to File request will expire on ${expirationDateString}.`
  };
  return messages[status](moment(data).format('MMM D, YYYY'), moment(expiredData).format('MMM D, YYYY'));
}

export function PrestartAlert({ status, data }) {
  let expiredExpirationData;
  let activeExpirationData = data;
  let alertType;
  const alertHeading = prestartAlertHeadings[status];
  let alertMessage;

  if (prestartSuccessStatuses.has(status)) {
    alertType = 'success';
    alertMessage = getPrestartSuccessMessage(status, activeExpirationData, expiredExpirationData);
  } else if (prestartFailureStatuses.has(status)) {
    alertType = 'error';
    alertMessage = prestartErrorMessages[status];
  }
  if (data.expiredData) {
    activeExpirationData = data.previous;
    expiredExpirationData = data.current;
  }
  return (<AlertBox
    status={alertType}
    isVisible
    content={<div>
      <h3>{alertHeading}</h3>
      <p>{alertMessage}</p>
      <AdditionalInfo triggerText="What is an Intent to File request?">
        <p>An Intent to File request lets you set an effective date, or the day you can start getting your benefits, while you prepare your application and gather supporting documents for your disability claim. If you submit an Intent to File before you file your claim, you may be able to get retroactive payments starting from your effective date.</p>
      </AdditionalInfo>
    </div>}/>);
}


export const UnauthenticatedAlert = (
  <div>
    <div className="usa-alert usa-alert-info schemaform-sip-alert">
      <div className="usa-alert-body">
        To apply for a disability increase, you’ll need to sign in and verify your account.
      </div>
    </div>
    <br/>
  </div>
);


export const UnverifiedAlert = (
  <div>
    <div className="usa-alert usa-alert-info schemaform-sip-alert">
      <div className="usa-alert-body">
        To apply for a disability increase, you’ll need to verify your account.
      </div>
    </div>
    <br/>
  </div>
);


export const VerifiedAlert =  (
  <div>
    <div className="usa-alert usa-alert-info schemaform-sip-alert">
      <div className="usa-alert-body">
        <strong>Note:</strong> Since you’re signed in to your account and your account is verified, we can prefill part of your application based on your account details. You can also save your form in progress, and come back later to finish filling it out. You have 1 year from the date you start or update your application to submit the form.
      </div>
    </div>
    <br/>
  </div>
);


export const GetFormHelp = () => {
  return (
    <div>
      <p className="help-talk">For help filling out this form, please call:</p>
      <p className="help-phone-number">
        <a className="help-phone-number-link" href="tel:+1-877-222-8387">1-877-222-VETS</a> (<a className="help-phone-number-link" href="tel:+1-877-222-8387">1-877-222-8387</a>)<br/>
        Monday &#8211; Friday, 8:00 a.m. &#8211; 8:00 p.m. (ET)
      </p>
    </div>
  );
};

// Returns most recent timestamp from a list of timestamps
export const getLatestTimestamp = (timestamps) => timestamps.sort((a, b) => new Date(b) - new Date(a))[0];

export const ITFDescription = (
  <span><strong>Note:</strong> By clicking the button to start the disability application, you’ll declare your intent to file, and this will set the date you can start getting benefits. This intent to file will expire 1 year from the day you start your application.</span>
);

export const VAFileNumberDescription = (
  <div className="additional-info-title-help">
    <AdditionalInfo triggerText="What does this mean?">
      <p>The VA file number is the number used to track your disability claim and evidence through the VA system. For most Veterans, your VA file number is the same as your Social Security number. However, if you filed your first disability claim a long time ago, your VA file number may be a different number.</p>
    </AdditionalInfo>
  </div>
);

const PhoneViewField = ({ formData: phoneNumber, name }) => {
  const isDomestic = phoneNumber.length <= 10;
  const midBreakpoint = isDomestic ? -7 : -8;
  const lastPhoneString = `${phoneNumber.slice(-4)}`;
  const middlePhoneString = `${phoneNumber.slice(midBreakpoint, -4)}-`;
  const firstPhoneString = `${phoneNumber.slice(0, midBreakpoint)}-`;

  const phoneString = `${firstPhoneString}${middlePhoneString}${lastPhoneString}`;
  return (<p><strong>{name}</strong>: {phoneString}</p>);
};

const EmailViewField = ({ formData, name }) => {
  return (<p><strong>{name}</strong>: {formData}</p>);
};

const EffectiveDateViewField = ({ formData }) => {
  return (
    <p>
      Effective Date: <DateWidget value={formData} options={{ monthYear: false }}/>
    </p>
  );
};

const AddressViewField = ({ formData }) => {
  const { addressLine1, addressLine2, addressLine3, city, state, country, zipCode } = formData;
  let zipString;
  if (zipCode) {
    const firstFive = zipCode.slice(0, 5);
    const lastChunk = zipCode.length > 5 ? `-${zipCode.slice(5)}` : '';
    zipString = `${firstFive}${lastChunk}`;
  }

  let lastLine;
  if (country === USA) {
    lastLine = `${city}, ${state} ${zipString}`;
  } else {
    lastLine = `${city}, ${country}`;
  }
  return (
    <div>
      {addressLine1 && <p>{addressLine1}</p>}
      {addressLine2 && <p>{addressLine2}</p>}
      {addressLine3 && <p>{addressLine3}</p>}
      <p>{lastLine}</p>
    </div>
  );
};

export const PrimaryAddressViewField = ({ formData }) => {
  const {
    mailingAddress, primaryPhone, emailAddress, forwardingAddress } = formData;
  return (
    <div>
      <AddressViewField formData={mailingAddress}/>
      {primaryPhone && (
        <PhoneViewField formData={primaryPhone} name="Primary phone"/>
      )}
      {emailAddress && (
        <EmailViewField formData={emailAddress} name="Email address"/>
      )}
      {formData['view:hasForwardingAddress'] && (
        <AddressViewField formData={forwardingAddress}/>
      )}
      {formData.effectiveDate && (
        <EffectiveDateViewField formData={forwardingAddress.effectiveDate}/>
      )}
    </div>
  );
};


export const FDCDescription = () => {
  return (
    <div>
      <h5>Fully developed claim program</h5>
      <p>
      You can apply using the Fully Developed Claim (FDC) program if
      you’ve uploaded all the supporting documents or supplemental
      forms needed to support your claim.
      </p>
      <a href="/pension/apply/fully-developed-claim/" target="_blank">
      Learn more about the FDC program
      </a>.
    </div>
  );
};


export const FDCWarning = () => {
  return (
    <div className="usa-alert usa-alert-info no-background-image">
      <div className="usa-alert-body">
        <div className="usa-alert-text">
          Since you’ve uploaded all your supporting documents, your
          claim will be submitted as a fully developed claim.
        </div>
      </div>
    </div>
  );
};


export const noFDCWarning = (
  <div className="usa-alert usa-alert-info no-background-image">
    <div className="usa-alert-body">
      <div className="usa-alert-text">
        Since you’ll be sending in additional documents later,
        your application doesn’t qualify for the Fully Developed
        Claim program. We’ll review your claim through the
        standard claim process. Please turn in any information to
        support your claim as soon as you can.
      </div>
    </div>
  </div>
);


export function queryForFacilities(input = '') {
  // Only search if the input has a length >= 3, otherwise, return an empty array
  if (input.length < 3) {
    return Promise.resolve([]);
  }

  const url = appendQuery('/facilities/suggested', {
    type: ['health', 'dod_health'],
    name_part: input // eslint-disable-line camelcase
  });

  return apiRequest(url, {},
    (response) => {
      return response.data.map(facility => ({ id: facility.id, label: facility.attributes.name }));
    },
    (error) => {
      Raven.captureMessage('Error querying for facilities', { input, error });
      return [];
    }
  );
}


const evidenceTypesDescription = (disabilityName) => {
  return (
    <p>What supporting evidence will you be turning in that shows your {disabilityName} <strong>has gotten worse since you received a VA rating</strong>?</p>
  );
};

export const getEvidenceTypesDescription = (form, index) => {
  return evidenceTypesDescription(getDiagnosticCodeName(form.disabilities[index].diagnosticCode));
};

/**
 * If user chooses private medical record supporting evidence, he/she has a choice
 * to either upload PMRs directly or fill out a 4142. Here, we determine if the user
 * chose the 4142 option for any of his/her disabilities
 * @param {array} disabilities
 * @returns {boolean} true if user selected option to fill out 4142 on their own
 */
export const get4142Selection = (disabilities) => {
  return disabilities.reduce((selected, disability) => {
    if (selected === true) {
      return true;
    }

    const {
      'view:selected': viewSelected,
      'view:uploadPrivateRecords': viewUploadPMR
    } = disability;
    if (viewSelected === true && viewUploadPMR === 'no') {
      return true;
    }
    return false;
  }, false);
};
