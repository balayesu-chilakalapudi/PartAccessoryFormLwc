import { LightningElement,api,wire,track} from 'lwc';
// import apex method from salesforce module 
import fetchLookupData from '@salesforce/apex/RE_EnrollmentlookupController.fetchLookupData';
const DELAY = 9000; 

export default class EnrollmentLookup extends LightningElement {
    // public properties with initial default values 
    @api recordTypeName = 'Retailer Employee';
    @api label = 'custom lookup label';
    @api placeholder = 'search...'; 
    @api iconName = 'standard:account';
    @api sObjectApiName = 'Account';
    @api defaultRecordId = '';
    @api selectFields = 'Id, Name, Email';
    @api isrequired = false;
    @api accountSet ='';
    @api defaultContact='';
    // private properties 
    @track lstResult = []; // to store list of returned records   
    @track hasRecords = true; 
    @track searchKey=''; // to store input field value    
    isSearchLoading = false; // to control loading spinner  
    delayTimeout;
    @track selectedRecord = {}; // to store selected lookup record in object formate 
    // initial function to populate default selected lookup record if defaultRecordId provided  
    islookupRequired = true;
    connectedCallback(){
           /* if(this.defaultRecordId != ''){
            fetchDefaultRecord({ recordId: this.defaultRecordId , 'sObjectApiName' : this.sObjectApiName, recordtypeName : '$recordTypeName', selectfields : '$selectFields' })
            .then((result) => {
                if(result != null){
                    this.selectedRecord = result;
                    this.handelSelectRecordHelper(); // helper function to show/hide lookup result container on UI
                    //this.isLookupValid();
                }
            })
            .catch((error) => {
                this.error = error;
                this.selectedRecord = {};
            });
            }*/
    }
    // wire function property to fetch search record based on user input
    /*@wire(fetchLookupData, { searchKey: '$searchKey' , sObjectApiName : '$sObjectApiName' , recordtypeName : '$recordTypeName', selectfields : '$selectFields', accountSet: '$accountSet', defaultContact:'$defaultContact'})
        searchResult(value) {
        const { data, error } = value; // destructure the provisioned value
        this.isSearchLoading = false;
        if (data) {
            console.log('data:'+JSON.stringify(data));
                this.hasRecords = data.length == 0 ? false : true; 
                this.lstResult = JSON.parse(JSON.stringify(data)); 
                if(this.sObjectApiName=='RE_Person_Role__c' && this.lstResult.length>0){
                    this.lstResult = this.lstResult.map(row => ({
                        ...row,
                        Name: row.RE_Contact__r.Name
                    }));
                }
            }
        else if (error) {
            console.log('(error---> ' + JSON.stringify(error));
            }
    };*/

        
    // update searchKey property on input field change  
    handleKeyChange(event) {
        // Debouncing this method: Do not update the reactive property as long as this function is
        // being called within a delay of DELAY. This is to avoid a very large number of Apex method calls.
        this.isSearchLoading = true;
       // window.clearTimeout(this.delayTimeout);
        const searchKey = event.target.value;
        this.searchKey = searchKey;
        /*this.delayTimeout = setTimeout(() => {
        this.searchKey = searchKey;
        }, DELAY);*/
        fetchLookupData({ searchKey: this.searchKey , sObjectApiName : this.sObjectApiName , recordtypeName : this.recordTypeName, selectfields : this.selectFields, accountSet: this.accountSet, defaultContact:this.defaultContact}).then(data=>{
            this.isSearchLoading = false;
            if (data) {
                console.log('data:'+JSON.stringify(data));
                    this.hasRecords = data.length == 0 ? false : true; 
                    this.lstResult = JSON.parse(JSON.stringify(data)); 
                    if(this.sObjectApiName=='RE_Person_Role__c' && this.lstResult.length>0){
                        this.lstResult = this.lstResult.map(row => ({
                            ...row,
                            Name: row.RE_Contact__r.Name
                        }));
                    }
                    else if(this.sObjectApiName=='PriceBookEntry' && this.lstResult.length>0){
                        this.lstResult = this.lstResult.map(row => ({
                            ...row,
                            Name: row.ProductCode
                        }));
                    }
                    this.error = undefined;
                }           
        }).catch(error => {
                        // Handle the error
                        console.log('(error---> ' + JSON.stringify(error));
        });
    }
    // method to toggle lookup result section on UI 
    toggleResult(event){
        const lookupInputContainer = this.template.querySelector('.lookupInputContainer');
        const clsList = lookupInputContainer.classList;
        const whichEvent = event.target.getAttribute('data-source');
        switch(whichEvent) {
            case 'searchInputField':
                clsList.add('slds-is-open');
                break;
            case 'lookupContainer':
                clsList.remove('slds-is-open');    
            break;                    
            }
    }
    // method to clear selected lookup record  
    handleRemove(){
    this.searchKey = '';    
    this.selectedRecord = {};
    this.lookupUpdatehandler(undefined); // update value on parent component as well from helper function 

    // remove selected pill and display input field again 
    const searchBoxWrapper = this.template.querySelector('.searchBoxWrapper');
        searchBoxWrapper.classList.remove('slds-hide');
        searchBoxWrapper.classList.add('slds-show');
        const pillDiv = this.template.querySelector('.pillDiv');
        pillDiv.classList.remove('slds-show');
        pillDiv.classList.add('slds-hide');
    }
    // method to update selected record from search result 
    handelSelectedRecord(event){   
        var objId = event.target.getAttribute('data-recid'); // get selected record Id 
        this.selectedRecord = this.lstResult.find(data => data.Id === objId); // find selected record from list 
        if(this.sObjectApiName=='RE_Personal_Role__c'){
            this.selectedRecord.Name=this.selectedRecord__r.Name;
        }
        this.lookupUpdatehandler(this.selectedRecord); // update value on parent component as well from helper function 
        this.handelSelectRecordHelper(); // helper function to show/hide lookup result container on UI
    }
    /*COMMON HELPER METHOD STARTED*/
    handelSelectRecordHelper(){
    this.template.querySelector('.lookupInputContainer').classList.remove('slds-is-open');
        const searchBoxWrapper = this.template.querySelector('.searchBoxWrapper');
        searchBoxWrapper.classList.remove('slds-show');
        searchBoxWrapper.classList.add('slds-hide');
        const pillDiv = this.template.querySelector('.pillDiv');
        pillDiv.classList.remove('slds-hide');
        pillDiv.classList.add('slds-show'); 
    }
    // send selected lookup record to parent component using custom event
    lookupUpdatehandler(value){    
            const evt = new CustomEvent('recordupdate',
            {
                'detail': {selectedRecord: value, objectName: this.sObjectApiName}
            }
        );
        this.dispatchEvent(evt);
    }
    @api isLookupValid(){
        let isValid = true;
        let inputFields = this.template.querySelectorAll('.entrollmentValidate');
        inputFields.forEach(inputField => {
            if(!inputField.checkValidity()) {
                inputField.reportValidity();
                isValid = false;
            }
        });
        return isValid;
    }
    /*lookupValidEvent(value){    
        const oEvent = new CustomEvent('lookupupdate',
        {
            'detail': {selectedRecord: value}
        }
    );
    this.dispatchEvent(oEvent);
    }*/
}