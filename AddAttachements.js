    var oLoader;  
    var attcount = 0;  
    var arraycount = 0;  
    var clientContext;

    $(document).ready(function ($) {  
        SP.SOD.executeFunc('sp.js', 'SP.ClientContext', execOperation);
        $('#file_input').multifile();
        $("#NewSaveItem").click(function () { formSave() });    
    });  
  
    function execOperation() {
        try {
            clientContext = new SP.ClientContext.get_current();                   
        }
        catch (err) {
            alert(err);
        }
    }
    function formSave() {             
        var data = [];  
        var fileArray = [];  
        $("#attachFilesHolder input:file").each(function () {  
            if ($(this)[0].files[0]) {  
                fileArray.push({ "Attachment": $(this)[0].files[0] });  
            }  
        });  
        arraycount += fileArray.length;
        data.push({  
            "Title": $("input[id='txtTitle']").val(),   
            "Files": fileArray  
        });  
        createNewItemWithAttachments("MultiAttachments", data).then(  
            function () {  
                window.location.replace(_spPageContextInfo.webAbsoluteUrl + "/Lists/MultiAttachments/AllItems.aspx");
            },  
            function (sender, args) {  
                console.log('Error occured' + args.get_message());  
            }  
        ) 
    }  
   
  
    var createNewItemWithAttachments = function (listName, listValues) {  
        var fileCountCheck = 0;  
        var fileNames;  
        var context = new SP.ClientContext.get_current();  
        var dfd = $.Deferred();  
        var targetList = context.get_web().get_lists().getByTitle(listName);  
        context.load(targetList);  
        var itemCreateInfo = new SP.ListItemCreationInformation();  
        var listItem = targetList.addItem(itemCreateInfo);  
        listItem.set_item("Title", listValues[0].Title);  
        listItem.update();  
        context.executeQueryAsync(  
            function () {  
                var id = listItem.get_id();  
                if (listValues[0].Files.length != 0) {  
                    if (fileCountCheck <= listValues[0].Files.length - 1) {  
                        loopFileUpload(listName, id, listValues, fileCountCheck).then(  
                            function () {  
                            },  
                            function (sender, args) {  
                                console.log("Error uploading");  
                                dfd.reject(sender, args);  
                            }  
                        );  
                    }  
                }  
                else {  
                    dfd.resolve(fileCountCheck);  
                }  
            },  
            function (sender, args) {  
                console.log('Error occured' + args.get_message());  
            }  
        );  
        return dfd.promise();  
    }  
  
    function loopFileUpload(listName, id, listValues, fileCountCheck) {  
        var dfd = $.Deferred();  
        uploadFileHolder(listName, id, listValues[0].Files[fileCountCheck].Attachment).then(  
            function (data) {  
                var objcontext = new SP.ClientContext();  
                var targetList = objcontext.get_web().get_lists().getByTitle(listName);  
                var listItem = targetList.getItemById(id);  
                objcontext.load(listItem);  
                objcontext.executeQueryAsync(function () {  
                    console.log("Reload List Item- Success");  
                    fileCountCheck++;  
                    if (fileCountCheck <= listValues[0].Files.length - 1) {  
                        loopFileUpload(listName, id, listValues, fileCountCheck);  
                    } else {  
                        console.log(fileCountCheck + ": Files uploaded");  
                        attcount += fileCountCheck;  
                        if (arraycount == attcount) {  
                            window.location.replace(_spPageContextInfo.webAbsoluteUrl + "/Lists/MultiAttachments/AllItems.aspx");  
                        }  
  
                    }  
                },  
                function (sender, args) {  
                    console.log("Reload List Item- Fail" + args.get_message());  
                });  
  
            },  
            function (sender, args) {  
                console.log("Not uploaded");  
                dfd.reject(sender, args);  
            }  
       );  
        return dfd.promise();  
    }  
  
    function uploadFileHolder(listName, id, file) {  
        var deferred = $.Deferred();  
        var fileName = file.name;  
        getFileBuffer(file).then(  
            function (buffer) {  
                var bytes = new Uint8Array(buffer);  
                var binary = '';  
                for (var b = 0; b < bytes.length; b++) {  
                    binary += String.fromCharCode(bytes[b]);  
                }  
                var scriptbase = _spPageContextInfo.webServerRelativeUrl + "/_layouts/15/";  
                console.log(' File size:' + bytes.length);  
                $.getScript(scriptbase + "SP.RequestExecutor.js", function () {  
                    var createitem = new SP.RequestExecutor(_spPageContextInfo.webServerRelativeUrl);  
                    createitem.executeAsync({  
                        url: _spPageContextInfo.webServerRelativeUrl + "/_api/web/lists/GetByTitle('" + listName + "')/items(" + id + ")/AttachmentFiles/add(FileName='" + file.name + "')",  
                        method: "POST",  
                        binaryStringRequestBody: true,  
                        body: binary,  
                        success: fsucc,  
                        error: ferr,  
                        state: "Update"  
                    });  
                    function fsucc(data) {  
                        console.log('data uploaded successfully');  
                        //alert('data uploaded successfully');
                        deferred.resolve(data);  
                    }  
                    function ferr(data) {  
                        console.log(fileName + "not uploaded error");  
                        alert(fileName + "not uploaded error");
                        deferred.reject(data);  
                    }  
                });  
  
            },  
            function (err) {  
                deferred.reject(err);  
            }  
        );  
        return deferred.promise();  
    }  
    function getFileBuffer(file) {  
        var deferred = $.Deferred();  
        var reader = new FileReader();  
        reader.onload = function (e) {  
            deferred.resolve(e.target.result);  
        }  
        reader.onerror = function (e) {  
            deferred.reject(e.target.error);  
        }  
        reader.readAsArrayBuffer(file);  
        return deferred.promise();  
    }  
   
