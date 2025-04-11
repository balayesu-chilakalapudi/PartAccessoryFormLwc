import { LightningElement, track, wire, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';
import getProfile from '@salesforce/apex/RE_PartsAccessoryFormLwcController.fetchProfile';
import getStoreDetails from '@salesforce/apex/RE_PartsAccessoryFormLwcController.getStoreInformation';
import RE_Enrollment_Step1_Para_Before from '@salesforce/label/c.RE_Enrollment_Step1_Para_Before';
import RE_Enrollment_Step1_Para_After from '@salesforce/label/c.RE_Enrollment_Step1_Para_After';
import RE_EmployeeProfile from '@salesforce/label/c.RE_EmployeeProfile';
import RE_VINInquiryError_CharLimit from '@salesforce/label/c.RE_VINInquiryError_CharLimit';
import RE_VINInquiryError_SpecialChar from '@salesforce/label/c.RE_VINInquiryError_SpecialChar';
import { getPicklistValues } from 'lightning/uiObjectInfoApi';
import PROMOTION_FIELD from '@salesforce/schema/RE_Workflow_Item__c.RE_Promotion__c';
import RE_Workflow_Item_OBJECT from '@salesforce/schema/RE_Workflow_Item__c';
import submitWorkflowItem from "@salesforce/apex/RE_PartsAccessoryFormLwcController.submitWorkflowItemData";
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import getVINInquiryResponseAction from "@salesforce/apex/RE_VINInquiryController.getVINInquiryResponse";

export default class RePartsAccessoryFormLwc extends NavigationMixin(LightningElement) {
    @track accessoryObj = {
        'dealershipName': '',
        'dealershipCode': '',
        'storeManagerFirstName': '',
        'streetAddress': '',
        'storeManagerLastName': '',
        'city': '',
        'state': '',
        'country': '',
        'managerEmailAddress': '',
        'preferredContactMethod': '',
        'promotion': '',
        'retailerId': '',
        'personRoleId': ''
    };
    value = '';

    employeeProfileUrl = '/employee-profile';
    @track pannelErrorMessage = '';
    enrollmentStep1ParaBefore = RE_Enrollment_Step1_Para_Before;
    enrollmentStep1ParaAfter = RE_Enrollment_Step1_Para_After;
    employeeProfileUrl = RE_EmployeeProfile;
    RE_VINInquiryError_CharLimit_msg = RE_VINInquiryError_CharLimit;
    RE_VINInquiryError_SpecialChar_msg = RE_VINInquiryError_SpecialChar;
    @track showPannelErrorMessage = false;

    get options() {
        return [
            { label: 'Phone', value: 'Phone' },
            { label: 'Email', value: 'Email' },
        ];
    }
    promotionPicklistValues;
    /*get recordTypeId() {
        if (this.workflowItemInfo && this.workflowItemInfo.data) {
            const rtis = this.workflowItemInfo.data.recordTypeInfos;
            return Object.keys(rtis).find(rti => rtis[rti].name === 'Part Accessory Information'); // Replace 'Your Record Type Name'
        }
        return null;
    }*/
    @track recordTypeId;

    @wire(getObjectInfo, { objectApiName: RE_Workflow_Item_OBJECT })
    workflowItemInfo({ error, data }) {
        console.log('workflowItemInfo > data:' + JSON.stringify(data));
        if (data) {
            const rtis = data.recordTypeInfos;
            this.recordTypeId = Object.keys(rtis).find(rti => rtis[rti].name === 'Part Accessory Information'); // Replace 'Your Record Type Name'
            console.log('recordtypeId:' + this.recordTypeId);
        } else if (error) {
            console.error('Error retrieving picklist values: ', error);
        }
    }

    @wire(getPicklistValues, { recordTypeId: '$recordTypeId', fieldApiName: PROMOTION_FIELD })
    wiredPicklistValues({ error, data }) {
        if (data) {
            this.promotionPicklistValues = data.values;
        } else if (error) {
            console.error('Error retrieving picklist values: ', error);
        }
    }

    get partAccessoryObjListNotEmpty() {
        console.log('partAccessoryObjListNotEmpty:' + (this.partAccessoryObjList.length > 0));
        return this.partAccessoryObjList.length > 0;
    }

    /*get promotion_options() {
        return [
            { label: '10% Offer (Parts Only)', value: '10' },
            { label: '20% Offer (Parts Only)', value: '20' },
            { label: '30% Offer (Parts Only)', value: '30' },
        ];
    }*/

    @track part_number_options = [];
    get part_number_options() {
        return part_number_options;
    }

    @track profile = [];
    @track selectedAccount = {};

    __wiredProfileData;
    @wire(getProfile)
    retrieveProfile(wiredResult) {
        let { data, error } = wiredResult;
        this.__wiredProfileData = wiredResult;
        if (data) {
            console.log('data:' + JSON.stringify(data));
            this.profile = data;
            var selected_accountId = this.profile.userSettings.RE_Default_Account_Id__c;
            for (let x of this.profile.accounts) {
                if (x.Id === selected_accountId) {
                    this.selectedAccount = x;
                    this.accessoryObj.dealershipName = x.Name;
                    this.accessoryObj.dealershipCode = x.Retailer__c;
                    this.accessoryObj.retailerId = x.Id;
                    break;
                }
            }
            this.getStoreInfo(selected_accountId);
            /* this.accounts = this.accounts.map((elem) => {
                 return {
                     ...elem,
                     get isCurrent() {
                         return this.Id == selected_accountId;
                     }
                 };
             });*/
        }
        if (error) {
            console.log(error);
            console.log(error);
            let message = 'Unknown error';
            if (Array.isArray(error.body)) {
                message = error.body.map(e => e.message).join(', ');
            } else if (typeof error.body.message === 'string') {
                message = error.body.message;
            }
            const evt = new ShowToastEvent({
                title: 'ERROR',
                message: message,
                variant: 'error',
                mode: 'dismissable'
            });
            this.dispatchEvent(evt);
            console.log('Error:' + message);
        }
    }

    @track partAccessoryObjList = [];

    getStoreInfo(selected_accountId) {
        console.log('selected_accountId:' + selected_accountId);
        getStoreDetails({ accountId: selected_accountId }).then(response => {
            let data = response;
            console.log('getStoreInfo:' + JSON.stringify(data));
            this.accessoryObj.name = data.name;
            this.accessoryObj.workPhone = data.workPhone;
            this.accessoryObj.workEmail = data.workEmail;
            this.accessoryObj.jobRole = data.jobRole;
            this.accessoryObj.personRoleId = data.personRoleId;
            for (let x of data.partAccessoryInfoList) {
                this.part_number_options.push({ label: x.Part_Number__c, value: JSON.stringify(x) });
            }

            /* this.accessoryObj.streetAddress=data.streetAddress;
             this.accessoryObj.storeManagerFirstName=data.storeManagerFirstName;
              this.accessoryObj.storeManagerLastName=data.storeManagerLastName;
              this.accessoryObj.city=data.city;   
              this.accessoryObj.state=data.state;
              this.accessoryObj.country=data.country;
              this.accessoryObj.managerEmailAddress=data.managerEmailAddress;
              this.accessoryObj.preferredContactMethod=data.preferredContactMethod;*/
        })
            .catch(error => {
                console.log(error);
                let message = 'Unknown error';
                if (Array.isArray(error.body)) {
                    message = error.body.map(e => e.message).join(', ');
                } else if (typeof error.body.message === 'string') {
                    message = error.body.message;
                }
                const evt = new ShowToastEvent({
                    title: 'ERROR',
                    message: message,
                    variant: 'error',
                    mode: 'dismissable'
                });
                this.dispatchEvent(evt);
                console.log('Error:' + message);
            });
    }

    @track openFormModalOpenBln = false;
    addPartsAccessorryBtnClick() {
        if (this.isPersonValid() && !this.handleInputValidation()) {
            // this.openFormBtnClick();
            this.partAccessoryObjList.push({
                Part_Number__c: '',
                Part_Description__c: '',
                Part_MSRP__c: '',
                Part_Customer_Discount__c: '',
                sObjectType: 'Workflow_Item_Detail__c'
            });
        }
    }

    openFormBtnClick() {
        this.openFormModalOpenBln = true;
    }

    closeOpenFormModal() {
        this.openFormModalOpenBln = false;
    }

    saveOpenFormModal() {

    }


    isPersonValid() {

        let isValid = true;
        try {

            let errorItem = [];
            if (!this.accessoryObj.Name) {
                errorItem.push('Name');
            }
            if (!this.accessoryObj.Phone) {
                errorItem.push('work phone number');
            }
            if (!this.accessoryObj.Email) {
                errorItem.push('work email');
            }
            if (!this.accessoryObj.jobRole) {
                errorItem.push('job role');
            }
            if (errorItem.length > 0) {
                this.pannelErrorMessage = errorItem.join(', ');
            }
            if (!this.accessoryObj.name || !this.accessoryObj.workPhone || !this.accessoryObj.workEmail || !this.accessoryObj.jobRole) {
                this.showPannelErrorMessage = true;
                isValid = false;
                const topDiv = this.template.querySelector('[data-id="ps_errorPanel"]');
                topDiv.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
            } else {
                this.showPannelErrorMessage = false;
                this.pannelErrorMessage = '';
            }
            console.log('!this.accessoryObj.Name:' + (!this.accessoryObj.Name));
            console.log('showPannelErrorMessage:' + this.showPannelErrorMessage);
            console.log('pannelErrorMessage:' + this.pannelErrorMessage);
        } catch (err) {
            isValid = false;
            console.log(err.stack);
        }
        return isValid
    }

    readVIN(event) {
        //  let invalidData = false;
        //  let emptyArray = ['', undefined, null, ' ', ';'];

        let vin = event.target.value;
        try {
            this.accessoryObj.vin = vin.trim();
        } catch (err) {
            console.log(err.stack);
        }
        this.handleInputValidation();
        /*
                let vinField = this.template.querySelector('lightning-input[data-name="vin"]');
                if (!emptyArray.includes(vinField)) {
                    let expression = new RegExp("^[a-zA-Z0-9 ]+$");
                    if (!expression.test(this.accessoryObj.vin)) {
                        invalidData = true;
                        vinField.setCustomValidity(this.RE_VINInquiryError_SpecialChar_msg);
                    }
                    else if (emptyArray.includes(this.accessoryObj.vin)) {
                        invalidData = true;
                        vinField.setCustomValidity('Please provide the VIN value');
        
                    } else if (this.accessoryObj.vin.length != 17) {
                        invalidData = true;
                        vinField.setCustomValidity(this.RE_VINInquiryError_CharLimit_msg);
                    }
                    else {
                        vinField.setCustomValidity('');
                    }
        
                }
                try {
        
                    if (!invalidData) {
                        this.isLoading = true;
                        getVINInquiryResponseAction({ strVIN: vin }).then(response => {
                            console.log('response:' + JSON.stringify(response));
                            if (response.blnIsError) {
                                this.isLoading = false;
                                vinField.setCustomValidity(response.strResponse);
                                vinField.reportValidity();
                            } else {
                                this.isLoading = false;
                               
                                vinField.reportValidity();
                            }
        
                        }).catch(error => {
                            console.log(error);
                            this.error = error;
                            let message = 'Unknown error';
                            if (Array.isArray(error.body)) {
                                message = error.body.map(e => e.message).join(', ');
                            } else if (typeof error.body.message === 'string') {
                                message = error.body.message;
                            }
                            const evt = new ShowToastEvent({
                                title: 'ERROR',
                                message: message,
                                variant: 'error',
                                mode: 'dismissable'
                            });
                            this.dispatchEvent(evt);
                            console.log('Error:' + message);
                        });
                    }
                } catch (err) {
                    console.log(err.stack);
                }*/

    }

    readFirstName(event) {
        this.accessoryObj.firstName = event.target.value;
        let firstName = event.target.value;
        try {
            this.accessoryObj.firstName = firstName.trim();
        } catch (err) {
            console.log(err.stack);
        }
        this.handleInputValidation();
    }

    readLastName(event) {
        this.accessoryObj.lastName = event.target.value;
        let lastName = event.target.value;
        try {
            this.accessoryObj.lastName = lastName.trim();
        } catch (err) {
            console.log(err.stack);
        }
        this.handleInputValidation();
    }

    readComments(event) {
        this.accessoryObj.comments = event.target.value;
        console.log('comments:' + this.accessoryObj.comments);
    }

    handleInputValidation() {
        let invalidData = false;
        let emptyArray = ['', undefined, null, ' ', ';'];
        let textarea_length = 255;
        try {
            let vin;
            let promotion;
            let firstName;
            let lastName;

            vin = this.template.querySelector('lightning-input[data-name="vin"]');
            promotion = this.template.querySelector('lightning-combobox[data-name="promotion"]');
            firstName = this.template.querySelector('lightning-input[data-name="firstName"]');
            lastName = this.template.querySelector('lightning-input[data-name="lastName"]');
            vin = this.template.querySelector('lightning-input[data-name="vin"]');

            if (!emptyArray.includes(vin)) {
                let expression = new RegExp("^[a-zA-Z0-9 ]+$");
                if (!expression.test(this.accessoryObj.vin)) {
                    invalidData = true;
                    vin.setCustomValidity(this.RE_VINInquiryError_SpecialChar_msg);
                }
                else if (emptyArray.includes(this.accessoryObj.vin)) {
                    invalidData = true;
                    vin.setCustomValidity('Please provide the VIN value');

                } else if (this.accessoryObj.vin.length != 17) {
                    invalidData = true;
                    vin.setCustomValidity(this.RE_VINInquiryError_CharLimit_msg);
                }
                else {
                    vin.setCustomValidity('');
                    if (!invalidData) {
                        this.isLoading = true;
                        getVINInquiryResponseAction({ strVIN: this.accessoryObj.vin }).then(response => {
                            console.log('response:' + JSON.stringify(response));
                            if (response.blnIsError) {
                                this.isLoading = false;
                                vin.setCustomValidity(response.strResponse);
                                vin.reportValidity();
                            } else {
                                this.isLoading = false;
                                /* const evt = new ShowToastEvent({
                                  title: 'Success',
                                    message: 'VIN:' + response.strResponse,
                                    variant: 'success',
                                });
                                this.dispatchEvent(evt);*/
                                vin.setCustomValidity('');
                                vin.reportValidity();
                            }

                        }).catch(error => {
                            console.log(error);
                            this.error = error;
                            let message = 'Unknown error';
                            if (Array.isArray(error.body)) {
                                message = error.body.map(e => e.message).join(', ');
                            } else if (typeof error.body.message === 'string') {
                                message = error.body.message;
                            }
                            const evt = new ShowToastEvent({
                                title: 'ERROR',
                                message: message,
                                variant: 'error',
                                mode: 'dismissable'
                            });
                            this.dispatchEvent(evt);
                            this.isLoading = false;
                            console.log('Error:' + message);
                        });
                    }
                }
                vin.reportValidity();
            }

            console.log('promotion:' + promotion);

            if (!emptyArray.includes(promotion)) {
                if (emptyArray.includes(this.accessoryObj.promotion)) {
                    invalidData = true;
                    promotion.setCustomValidity('Please provide the Promotion value');
                }
                else {
                    promotion.setCustomValidity('');
                }
                promotion.reportValidity();
            }

            if (!emptyArray.includes(firstName)) {
                if (emptyArray.includes(this.accessoryObj.firstName)) {
                    invalidData = true;
                    firstName.setCustomValidity('Please provide the First Name');
                } else {
                    firstName.setCustomValidity('');
                }
                firstName.reportValidity();
            }

            if (!emptyArray.includes(lastName)) {
                if (emptyArray.includes(this.accessoryObj.lastName)) {
                    invalidData = true;
                    lastName.setCustomValidity('Please provide the Last Name');
                }
                else {
                    lastName.setCustomValidity('');
                }
                lastName.reportValidity();
            }

        } catch (err) {
            console.log(err.stack);
        }
        return invalidData;
    }

    handlePromotionChange(event) {
        this.accessoryObj.promotion = event.detail.value;
        console.log('this.accessoryObj.promotion:' + this.accessoryObj.promotion);
        if (!this.handleInputValidation()) {
            this.partAccessoryObjList.forEach(x => { x.Part_Customer_Discount__c = (parseFloat(x.Part_MSRP__c) * parseFloat(this.accessoryObj.promotion) / 100); });
            console.log('this.partAccessoryObjList:' + JSON.stringify(this.partAccessoryObjList));
        }
    }

    @track itemIndex;
    handlePartNumberChange(event) {
        try {
            this.itemIndex = event.currentTarget.dataset.index;
            let partObj = JSON.parse(event.target.value);
            console.log('partObj:' + JSON.stringify(partObj));
            console.log('partAccessoryObjList:' + JSON.stringify(this.partAccessoryObjList)); 
            console.log('itemIndex:' + this.itemIndex);
            console.log('this.accessoryObj.promotion:' + this.accessoryObj.promotion);
            console.log(this.partAccessoryObjList[this.itemIndex]);
            this.partAccessoryObjList[this.itemIndex].Part_Number__c = partObj.Part_Number__c;
            this.partAccessoryObjList[this.itemIndex].Part_Description__c = partObj.Description__c;
            this.partAccessoryObjList[this.itemIndex].Part_MSRP__c = partObj.MSRP__c;
            this.partAccessoryObjList[this.itemIndex].Part_Customer_Discount__c = parseFloat(partObj.MSRP__c) * parseFloat(this.accessoryObj.promotion) / 100;
            this.validatePartAccessoryObjList();
        } catch (err) {
            console.log('Error:' + err.stack + '\n' + err.message + '\n' + err.lineNumber + '\n' + err);
        }
    }
    get totalCustomerDiscount() {
        let total = 0;
        for (let x of this.partAccessoryObjList) {
            if (x.Part_Customer_Discount__c != null && x.Part_Customer_Discount__c != undefined && x.Part_Customer_Discount__c != '') {
                total += parseFloat(x.Part_Customer_Discount__c);
            }
        }
        return total;
    }

    @track workflowItemId;
    //@track workflowItemDetail = { 'sObjectType': 'Workflow_Item_Detail__c', 'RE_Changes_Made_To_PC__c': '', 'workflowitem__c': this.workflowItemId, 'RE_OS_Type_Txt__c':'' };
    @track workflowItemObj = {
        'sObjectType': 'RE_Workflow_Item__c'
    }

    @track paObjList = [];
    @track disableSubmitBtn = false;
    @track isLoading = false;
    submitDataBtnClick() {
        if (this.isPersonValid() && !this.validatePartAccessoryObjList()) {
            console.log('accessoryObj:' + JSON.stringify(this.accessoryObj));
            this.isLoading = true;
            this.workflowItemObj.Customer_First_Name__c = this.accessoryObj.firstName;
            this.workflowItemObj.Phone__c = this.accessoryObj.workPhone;
            this.workflowItemObj.Email__c = this.accessoryObj.workEmail;
            this.workflowItemObj.Retailer_Code_old__c = this.accessoryObj.dealershipCode;
            this.workflowItemObj.Retailer__c = this.accessoryObj.retailerId;
            this.workflowItemObj.RE_Job_Role__c = this.accessoryObj.jobRole;
            this.workflowItemObj.RE_Person_Role__c = this.accessoryObj.personRoleId;
            this.workflowItemObj.RE_Promotion__c = this.accessoryObj.promotion;
            this.workflowItemObj.Retailer_Comments__c = this.accessoryObj.comments;
            this.workflowItemObj.Total_Customer_discount__c = this.totalCustomerDiscount;
            this.workflowItemObj.Status__c = 'Submitted';
            console.log('workflowItemObj:' + JSON.stringify(this.workflowItemObj));
            console.log('partAccessoryObjList:' + JSON.stringify(this.partAccessoryObjList));
            submitWorkflowItem({
                partAccessoryObjList: this.partAccessoryObjList,
                workflowItem: this.workflowItemObj
            }).then(response => {
                this.isLoading = false;
                this.workflowItemId = response;
                if (this.workflowItemId != null) {
                    this.disableSubmitBtn = true;
                } else {
                    this.disableSubmitBtn = false;
                }

                //  this.showPCChanes=false;
                const evt = new ShowToastEvent({
                    title: 'Success',
                    message: 'Data has been successfully Submitted.',
                    variant: 'success',
                });
                this.dispatchEvent(evt);
                this.error = undefined;
                //  this.showException = false;
            }).catch(error => {
                console.log(error);
                this.error = error;
                let message = 'Unknown error';
                if (Array.isArray(error.body)) {
                    message = error.body.map(e => e.message).join(', ');
                } else if (typeof error.body.message === 'string') {
                    message = error.body.message;
                }
                const evt = new ShowToastEvent({
                    title: 'ERROR',
                    message: message,
                    variant: 'error',
                    mode: 'dismissable'
                });
                this.dispatchEvent(evt);
                console.log('Error:' + message);

                this.isLoading = false;
                // this.closeOpenFormModal();
            })
        } else {
            /*  const evt = new ShowToastEvent({
                      title: 'ERROR',
                      message: 'Please check your inputs and submit again',
                      variant: 'error',
                      mode: 'dismissable'
                  });
                  this.dispatchEvent(evt);*/
        }
    }


    validatePartAccessoryObjList() {
        let invalidData = false;
        try {
            const emptyArray = ['', undefined, null, ' ', ';'];
            const comboboxes = this.template.querySelectorAll('lightning-combobox[data-index]');

            comboboxes.forEach((comboBox, index) => {
                const part = this.partAccessoryObjList[index];
                if (!emptyArray.includes(part?.Part_Number__c)) {
                    comboBox.setCustomValidity('');
                } else {
                    comboBox.setCustomValidity('Please select the Part Number');
                    invalidData = true;
                }
                comboBox.reportValidity();
            });

        } catch (err) {
            console.log(err.stack);
        }
        return invalidData;
    }


}