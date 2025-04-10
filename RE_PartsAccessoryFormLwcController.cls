public with sharing class RE_PartsAccessoryFormLwcController {
    public RE_PartsAccessoryFormLwcController() {

    }

    @AuraEnabled(cacheable=true)
    public static RE_CommunityProfile fetchProfile() {
        try {
            return new RE_CommunityProfile(UserInfo.getUserId());
        }
        catch (Exception e) {
            System.debug(e.getMessage() + ' ' + e.getStackTraceString());
            throw new AuraException('Failed to retrieve profile information');
        }
    }

    @AuraEnabled(cacheable=false)
    public static StoreWrapper getStoreInformation(String accountId){
        StoreWrapper sw=new StoreWrapper();
        try {            
            User userObj = [Select Id, Email, ContactId, Profile.Name from User Where Id =:UserInfo.getUserId() Limit 1]; 
           
            String userEmail = userObj.Email;
            Contact contactObj;
            if(userObj.ContactId !=null) {
                Id conId = userObj.ContactId;
                contactObj = [Select Id, Name, Phone,Email,MailingStreet,MailingCity, MailingState,MailingCountry
                 from Contact Where Id=:conId Limit 1];
            }
            else{            
            List<Contact> conList = [Select Id, Name, Phone, Email,MailingStreet,MailingCity,MailingState,MailingCountry
                from Contact Where Email=:userEmail And AccountId=:accountId];
                if(conList.size() > 0) {
                    contactObj = conList[0];
                }
            }
            if(contactObj!=null){
           /* sw.streetAddress=contactObj.MailingStreet;
            sw.city=contactObj.MailingCity;
            sw.state=contactObj.MailingState;
            sw.country=contactObj.MailingCountry;*/
            sw.name=contactObj.Name;    
            RE_Person_Role__c personRole=[Select Id,DPM_Work_Phone__c,DPM_Work_Email__c,RE_Employee_Position__c From RE_Person_Role__c
            where RE_Contact__c=:contactObj.Id 
            and RE_Account__c=:accountId
            AND RE_User__c =:userObj.Id
            AND RE_Psn_Active__c = TRUE
            AND RE_Position_Active__c = TRUE
            limit 1];
               sw.workPhone=personRole.DPM_Work_Phone__c;
               sw.workEmail=personRole.DPM_Work_Email__c;
               sw.jobRole=personRole.RE_Employee_Position__c;  
               sw.personRoleId=personRole.Id;
            }
            sw.partAccessoryInfoList=[select Part_Number__c, Description__c, MSRP__c from RE_Part_Accessory_Information__c];
             return sw;
        } catch (Exception e) {
            throw new AuraHandledException(e+'\n'+e.getStackTraceString()+'\n'+e.getMessage());
        }
    }
    @AuraEnabled
    public static String submitWorkflowItemData(List<Workflow_Item_Detail__c> partAccessoryObjList,RE_Workflow_Item__c workflowItem){        
        String workflowItemId;
            try{
                workflowItem.RecordTypeId=Schema.SObjectType.RE_Workflow_Item__c.getRecordTypeInfosByName().get('Part Accessory Information').getRecordTypeId();
            insert workflowItem; 
            workflowItemId=workflowItem.Id;
            for(Workflow_Item_Detail__c wid:partAccessoryObjList){
                wid.workflowitem__c=workflowItemId;
                wid.RecordTypeId=Schema.SObjectType.Workflow_Item_Detail__c.getRecordTypeInfosByName().get('Part Accessory Information').getRecordTypeId();
            }
            insert partAccessoryObjList;
        }catch(Exception ex){
            throw new AuraHandledException(ex+'\n'+ex.getStackTraceString());
        }
        return workflowItemId;
    }

    public class StoreWrapper{
        @AuraEnabled public String name;
        @AuraEnabled public String workPhone;
        @AuraEnabled public String workEmail;
        @AuraEnabled public String jobRole;
        @AuraEnabled public String personRoleId;
        @AuraEnabled public List<RE_Part_Accessory_Information__c> partAccessoryInfoList;
/*@AuraEnabled public String city;
        @AuraEnabled public String preferredContactMethod;
        @AuraEnabled public String state;
        @AuraEnabled public String managerEmailAddress;
        @AuraEnabled public String country;*/
    }
}