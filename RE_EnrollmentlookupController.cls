public with Sharing class RE_EnrollmentlookupController {
	// Method to fetch lookup search result   
    @AuraEnabled(cacheable=false)
    public static list<sObject> fetchLookupData(string searchKey , string sObjectApiName, String recordtypeName, String selectfields, List<String> accountSet, String defaultContact) {  
        Id RecordTypeId;
        String retailerRecordTypeName = System.Label.LXP_Recordtype_Name;
        String corporateRecordTypeName = System.Label.LXP_Corporate_Recordtype_Name;
        String supplierRecordTypeName = System.Label.LXP_Supplier_Recordtype_Name;
        Set<String> contactRecordTypeSet = new Set<String>();
        
        string sQuery;
        String selectedFieldSet = String.EscapeSingleQuotes(selectfields);
        String sObjectApi = String.EscapeSingleQuotes(sObjectApiName);
        List < sObject > returnList = new List < sObject > ();
        set<String> contactSet = new Set<String>();
        set<String> returnedcontactSet = new Set<String>();
        List<String> AccountList = new List<String>();
        try{
            if(sObjectApiName == 'contact'){
                contactRecordTypeSet.add(Schema.SObjectType.Contact.getRecordTypeInfosByName().get(retailerRecordTypeName).getRecordTypeId()) ;
                contactRecordTypeSet.add(Schema.SObjectType.Contact.getRecordTypeInfosByName().get(corporateRecordTypeName).getRecordTypeId());
                contactRecordTypeSet.add(Schema.SObjectType.Contact.getRecordTypeInfosByName().get(supplierRecordTypeName).getRecordTypeId());
                AccountList = accountSet;
            }
            else if(sObjectApi == 'account'){
                RecordTypeId = Schema.SObjectType.Account.getRecordTypeInfosByName().get(recordtypeName).getRecordTypeId();
            }
            string sWildCardText = '%' + searchKey + '%';
            if(sObjectApi == 'contact'){
                sQuery = 'Select ' + selectedFieldSet +  ' From ' + sObjectApi + ' Where RecordTypeId IN : contactRecordTypeSet AND AccountId IN : AccountList AND Id !=: defaultContact AND Name Like : sWildCardText order by createdDate DESC LIMIT 5';
            }
           else if(sObjectApi == 'RE_Person_Role__c'){ //RE_Employee_Position__c!=NULL AND DPM_Work_Phone__c!=null and DPM_Work_Email__c!=null AND
                sQuery = 'Select '+selectedFieldSet+' From ' + sObjectApi + ' Where RE_Contact__c!=null AND RE_PSN_Active__c=true AND DPM_Primary__c=true AND RE_Contact__r.AccountId IN : accountSet AND RE_Contact__r.Name Like : sWildCardText order by createdDate DESC LIMIT 5';
            }
            else if(sObjectApi=='PriceBookEntry'){
                sQuery='SELECT Id, Name, Pricebook2.name,Product2Id,Product2.Name, UnitPrice, IsActive, ProductCode FROM PricebookEntry where isactive=true and pricebook2.name=\'Dealer Accessory\' AND ProductCode Like : sWildCardText';
            }            
            else{
                sQuery = 'Select ' + selectedFieldSet +  ' From ' + sObjectApi + ' Where Type = \'Loaner\' AND Name Like : sWildCardText order by createdDate DESC LIMIT 5';
            }
            Set<String> dupSet=new Set<String>();
            for (sObject obj: database.query(sQuery)) {
                if(sObjectApi == 'contact'){
                    contactSet.add(obj.Id);
                } 
                else if(sObjectApi == 'RE_Person_Role__c'){
                    RE_Person_Role__c pr=(RE_Person_Role__c)obj;
                    if(!dupset.contains(pr.RE_Contact__r.Name)){
                        dupset.add(pr.RE_Contact__r.Name);
                        returnList.add(pr);
                    }
                }               
                else{
                    returnList.add(obj);
                }
                
            }
            if(!contactSet.isEmpty() && sObjectApi == 'contact'){
                for(RE_Person_Role__c pr: [Select Id,RE_Account__c, RE_Contact__c from RE_Person_Role__c Where RE_Account__c IN:AccountList AND
                                           RE_Contact__c IN: contactSet AND RE_Psn_Active__c = true]){
                                               returnedcontactSet.add(pr.RE_Contact__c);
                                           }
            }
            if(!returnedcontactSet.isEmpty() && sObjectApi == 'contact'){
                returnList =[Select Id, Name, Email from Contact Where Id IN: returnedcontactSet order by createdDate DESC LIMIT 5];
            }
        }
        catch(Exception e){
            VolvoLogger log = new VolvoLogger();
            log.Log('RE_EnrollmentlookupController.fetchLookupData',e,'Exception_Log','','Exception From RE_EnrollmentlookupController.fetchLookupData');
        }
        return returnList;
    }
}