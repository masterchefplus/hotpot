Invite = {
    claimRatio: 0,
    myInviteCode:0,
    inputvalidated:false,
    eventBlocks: new Set(),
    initInviteInfo: function () {
        // event InviteCreated(address creator);
        // event InviteInput(address user,uint256 code);
        // event InviteValidate(address validator);

        contractsInstance.Invite.InviteCreated({ creator: defaultAccount }, function (error, result) {
            if (!error) {
                console.log("InviteCreated");
                if (Invite.eventBlocks.has(result.blockNumber)) {
                    return;
                }
                Invite.eventBlocks.add(result.blockNumber);
                Invite.getMyInviteCode();
            }
        });

        contractsInstance.Invite.InviteInput({ user: defaultAccount }, function (error, result) {
            if (!error) {
                console.log("InviteInput");
                if (Invite.eventBlocks.has(result.blockNumber)) {
                    return;
                }
                Invite.eventBlocks.add(result.blockNumber);

                Invite.getInputInviteCode();
            }
        });
        contractsInstance.Invite.InviteValidate({ validator: defaultAccount }, function (error, result) {
            if (!error) {
                console.log("InviteValidate");
                if (Invite.eventBlocks.has(result.blockNumber)) {
                    return;
                }
                Invite.eventBlocks.add(result.blockNumber);

                $("#invitevalidated").show();
                $("#inviteinputed").hide();
                Invite.claimRatio += 0.01;
                Invite.updateRatio();
            }
        });
        Invite.getMyInviteCode();
        contractsInstance.Invite.getInviteNum(defaultAccount, function (e, r) {
            $("#totalinvite").text(r);
        });
        contractsInstance.Invite.calValidNum(defaultAccount, function (e, r) {
            $("#validateinvite").text(r);
        });
        contractsInstance.Invite.calRatioUpdate(defaultAccount, function (e, r) {
            var ratio = r / 1000;
            console.log("calRatioUpdate="+ratio);
            Invite.claimRatio += ratio;
            Invite.updateRatio();
        });
        Invite.getInputInviteCode();

        contractsInstance.Invite.checkValidated(defaultAccount, function (e, r) {
            console.log("checkValidated="+r);
            Invite.inputvalidated = r;
            if (r) {
                $("#invitevalidated").show();
                $("#inviteinputed").hide();
            } else {
                $("#invitevalidated").hide();
            }
        });
    },
    getInputInviteCode:function(){
        contractsInstance.Invite.getInputInviteCode(defaultAccount, function (e, r) {
            console.log("getInputInviteCode="+r);
            if (r == 0) {
                $("#inputinvitecode").show();
                $("#inviteinputed").hide();
            } else {
                $("#inputinvitecode").hide();
                if(!Invite.inputvalidated)
                $("#inviteinputed").show();
            }
        });
    },
    getMyInviteCode:function(){
        contractsInstance.Invite.getMyInviteCode(defaultAccount, function (e, r) {
            console.log("getMyInviteCode="+r);
            if (r != 0) {
                Invite.myInviteCode=r;
                $("#myinvitecode").text(r);
                $("#nocodetip").hide();
                $("#myinvitecode").show();
            }
            else {
                $("#nocodetip").show();
                $("#myinvitecode").hide();
            }
        });
    },
    updateRatio: function () {
        $("#claimratioup").text(100 * Invite.claimRatio + "%");
    },
    inputCode:function(){
        var code = $("#inviteInput").val();
        console.log("code="+code);
        var regex = /^\d+$/;
        if (regex.test(code)) {
            if(code==Invite.myInviteCode){
                toastAlert(getString('inputyourcode'));
            }else if(code<1000){
                toastAlert(getString('inputwrong'));
            }else
            contractsInstance.Invite.inputCode(code,function(e,r){
                afterSendTx(e,r);
            });
        }else{
            toastAlert(getString('inputwrong'));
        }
    },
}