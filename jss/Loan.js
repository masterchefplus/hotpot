const utils = require('web3-utils');
const BN = require('bn.js');


Loan = {
    listSize: 0,
    listIds: [],
    listTokens: {},
    allowance: 0,
    eventBlocks: new Set(),
    eventBlocks1: new Set(),
    getLoan: function () {
        Loan.initLoanTable();
        contractsInstance.HotPot.Approval({ owner: defaultAccount, spender: contractsInstance.Loan.address }, function (error, result) {
            if (!error) {
                console.log("Approve success!");
                if (Loan.eventBlocks.has(result.blockNumber)) {
                    return;
                }
                Loan.eventBlocks.add(result.blockNumber);

                var nb = new BN(10);
                nb = nb.pow(new BN(30));
                if (result.args.value.lt(nb)) {
                    return;
                }
                Loan.allowance = result.args.value;
                console.log("approval spender=" + result.args.spender);
                Loan.initLoanTable();
            }
        });
        contractsInstance.HotPot.allowance(defaultAccount, contractsInstance.Loan.address, function (e, r) {
            if (!e) {
                Loan.allowance = r;
            }
            contractsInstance.Loan.getLoanList(function (e, r) {
                console.log("market getListToken=" + r);
                Loan.listIds = r;
                for (var i = 0; i < r.length; i++) {
                    Loan.getNFTInfo(r[i]);
                }
            });
        });
        contractsInstance.Loan.getLoanSize(function (e, r) {
            console.log("getLoanSize=" + r);
            if (!e) {
                Loan.listSize = r;
            }
        });

        contractsInstance.Loan.getLoanList(function (e, r) {
            console.log("getLoanList=" + r);
            if (!e) {
                Loan.listIds = r;
            }
        });
        contractsInstance.Loan.TokenDeposit(function (e, r) {
            console.log("TokenDeposit");
        });
        contractsInstance.Loan.TokenCancelDeposit(function (e, r) {
            console.log("TokenCancelDeposit");
        });
        contractsInstance.Loan.TokenBorrowed(function (e, r) {
            console.log("TokenBorrowed");
        });
        Loan.addHistory();
    },
    addHistory: function () {
        console.log("addHistory");
        $("#tableloanhistory").empty();
        var node = $("<tr  style='height:60px!important;'></tr>");

        var nodeid = $("<td>ID</td>");
        var nodegrade = $("<td data-lang='grade'></td>").text(getString('grade'));
        var nodeprice = $("<td data-lang='priceday'></td>").text(getString('priceday'));
        var nodeendtime = $("<td data-lang='borrowtime'></td>").text(getString('borrowtime'));
        var nodeaction = $("<td data-lang='borrower' style='text-align: center!important;'></td>").text(getString('borrower'));
        var nodeblock = $("<td data-lang='actiontime' style='text-align: center;'></td>").text(getString('actiontime'));
        node.append(nodeid);
        node.append(nodegrade);
        node.append(nodeprice);
        node.append(nodeendtime);
        node.append(nodeaction);
        node.append(nodeblock);
        $("#tableloanhistory").append(node);

        var loanEvents = contractsInstance.Loan.allEvents({ filter: { event: 'TokenBorrowed' }, fromBlock: 0, toBlock: 'latest' });
        loanEvents.get(function (e, r) {
            for (var i = 0; i < r.length; i++) {
                var event = r[i];
                if (event.event == 'TokenBorrowed') {
                    console.log("TokenBorrowed");
                    // grade
                    var borrow = Loan.createBorrowInfo(event.args.borrower, event.args.tokenId,
                        event.args.pricePerDay, event.args.borrowDays, event.transactionHash, event.blockNumber);
                    Loan.addBorrowInfo(borrow);
                }
            }
        });
        loanEvents.stopWatching();
    },
    createBorrowInfo: function (borrower, tokenId, pricePerDay, borrowDays, hash, blockNumber) {
        var info = new Object();
        info.borrower = borrower;
        info.id = tokenId;
        info.price = pricePerDay;
        info.borrowDays = borrowDays;
        info.grade = 1;
        info.hash = hash;
        info.blockNumber = blockNumber;
        return info;
    },
    addBorrowInfo: function (nft) {
        // var h = $("<p></p>").text(info.borrower+" borrowed ID="+info.tokenId+",price per day "+info.pricePerDay/10**18+" HotPot");
        // $("#loanhistory").append(h);

        var node = $("<tr style='height:60px!important;'></tr>");


        var nodeid = $("<td></td>").text(formatZero(nft.id, 3));
        node.append(nodeid);

        var nodegradein;
        if (nft.grade == 1) {
            nodegradein = $("<span data-lang='grade1'></span>").text(getString('grade1'));
        }
        else if (nft.grade == 2) {
            nodegradein = $("<span data-lang='grade2'></span>").text(getString('grade2'));
        } else if (nft.grade == 3) {
            nodegradein = $("<span data-lang='grade3'></span>").text(getString('grade3'));
        }

        var nodegrade = $("<td></td>");
        nodegrade.append(nodegradein);
        node.append(nodegrade);

        var price = nft.price.div(Math.pow(10, 18));
        if (price > 10000) {
            price = 0;
        }
        var nodeprice = $("<td></td>").text(price.toFixed(2));
        node.append(nodeprice);

        var nodeendtime = $("<td></td>").text(nft.borrowDays + getString('day'));
        node.append(nodeendtime);

        var pre = nft.borrower.substr(0, 5);
        var last = nft.borrower.substr(nft.borrower.length - 5, nft.borrower.length - 1);
        var text = pre + "..." + last;
        var nodea = $("<a target='_blank' style='color:blue'></a>").text(text);
        nodea.attr("href", getEthersanUrl(nft.hash));
        var nodetdbtn = $("<td style='text-align: center;'></td>").append(nodea);

        node.append(nodetdbtn);

        var timestamp = web3.eth.getBlock(nft.blockNumber).timestamp;
        var now = Math.floor((new Date()).getTime()/1000);
        var delay = now - timestamp;
        var delaystr = formatTime2Min(delay)+" "+getString('ago');

        var nodeblockNumber = $("<td style='text-align: center;'></td>").text(delaystr);
        node.append(nodeblockNumber);

        $("#tableloanhistory").append(node);
    },
    getNFTInfo: function (id) {
        console.log("getNFTInfo id=" + id);
        contractsInstance.NFTHotPot.getGrade(id, function (e, r) {
            var grade = r;
            var nft = Loan.createLoanNft(id, grade);
            Loan.listTokens[id] = nft;

            contractsInstance.Loan.reservations(id, function (e, r) {
                var tokenId = r[0];
                var owner = r[1];
                var borrower = r[2];
                var borrowEndTime = r[3];
                var pricePerDay = r[4];
                var start = r[5];
                var times = r[6];

                var nft = Loan.listTokens[id];

                nft.id = tokenId;
                nft.price = pricePerDay;
                nft.days = times;
                nft.startTime = start;
                nft.borrower = borrower;
                nft.borrowEndTime = borrowEndTime;
                nft.owner = owner;
                Loan.addNFTToTable(nft);
                Loan.checkMyBorrowed(nft);
            });
        });
    },
    checkMyBorrowed: function (nft) {
        if (nft.borrower == defaultAccount) {
            var id = nft.id;
            var timenow = Math.floor((new Date()).getTime() / 1000);
            if(nft.borrowEndTime<timenow){
                return;
            }
            UserNFT.borrowIds.push(nft.id);
            var borrow = NFT.createNFTInfo(nft.id, nft.owner);
            borrow.grade = nft.grade;
            borrow.borrowed=true;
            borrow.borrowEndTime=nft.borrowEndTime;
            UserNFT.borrowNFTs[nft.id] = borrow;
            contractsInstance.NFTHotPot.getUseTime(id,function(e,r){
                if(!e){
                    UserNFT.borrowNFTs[id].usetime=r;
                }
            });
        }
    },
    initLoanTable: function () {
        console.log("initLoanTable");
        $("#tableloan").empty();
        var node = $("<tr></tr>");
        var nodeid = $("<td>ID</td>");
        var nodegrade = $("<td data-lang='grade'></td>").text(getString('grade'));
        var nodeprice = $("<td data-lang='priceday'></td>").text(getString('priceday'));
        var nodeendtime = $("<td data-lang='nodeendtime'></td>").text(getString('nodeendtime'));
        var nodeaction = $("<td data-lang='action' style='text-align: center;'></td>").text(getString('action'));
        node.append(nodeid);
        node.append(nodegrade);
        node.append(nodeprice);
        node.append(nodeendtime);
        node.append(nodeaction);
        $("#tableloan").append(node);

        for (var i = 0; i < Loan.listIds.length; i++) {
            var id = Loan.listIds[i];
            var nft = Loan.listTokens[id];
            Loan.addNFTToTable(nft);
        }
    },
    addNFTToTable: function (nft) {
        var lasttime = nft.days.mul(86400).plus(nft.startTime);
        var timenow = Math.floor((new Date()).getTime() / 1000);
        if (timenow > lasttime) {
            console.log("this token is out of date");
            return;
        }
        if (nft.borrowEndTime > timenow) {
            console.log("This token is borrowed");
            return;
        }

        var node = $("<tr></tr>");
        node.attr("id", "tr" + nft.id);

        var nodeid = $("<td></td>").text(formatZero(nft.id, 3));
        node.append(nodeid);

        var nodegradein;
        if (nft.grade == 1) {
            nodegradein = $("<span data-lang='grade1'></span>").text(getString('grade1'));
        }
        else if (nft.grade == 2) {
            nodegradein = $("<span data-lang='grade2'></span>").text(getString('grade2'));
        } else if (nft.grade == 3) {
            nodegradein = $("<span data-lang='grade3'></span>").text(getString('grade3'));
        }

        var nodegrade = $("<td></td>");
        nodegrade.append(nodegradein);
        node.append(nodegrade);

        var price = nft.price.div(Math.pow(10, 18));
        if (price > 10000) {
            price = 0;
        }
        var nodeprice = $("<td></td>").text(price.toFixed(2));
        node.append(nodeprice);

        var delay = lasttime - timenow;

        var nodeendtime = $("<td></td>").text(formatTime2Min(delay));
        node.append(nodeendtime);

        var nodetdbtn = $("<td style='text-align: center;'></td>");

        if (Loan.allowance == 0) {
            var nodebtn = $("<button class='green button' data-lang='approve'></button>").text(getString('approve'));
            nodetdbtn.on("click", nodebtn, function () { Loan.approve() });
            nodetdbtn.append(nodebtn);
        } else {
            if (nft.owner == defaultAccount) {
                var nodebtn = $("<button class='green button' data-lang='cancelloan'></button>").text(getString('cancelloan'));
                nodetdbtn.on("click", nodebtn, function () { Loan.cancelDeposit(nft.id) });
                nodetdbtn.append(nodebtn);
            } else {
                var nodebtn = $("<button class='green button' data-lang='borrow'></button>").text(getString('borrow'));
                nodetdbtn.on("click", nodebtn, function () { Loan.borrowNFT(nft.id) });
                nodetdbtn.append(nodebtn);
            }
        }
        node.append(nodetdbtn);

        $("#tableloan").append(node);
    },
    cancelDeposit: function (id) {
        console.log("cancelDeposit " + id);
        var timenow = Math.floor((new Date()).getTime() / 1000);
        if(UserNFT.nftInfos[id].borrowEndTime>timenow){
            toastAlert(getString('isborrowed'));
            return;
        }
        contractsInstance.Loan.cancelDeposit(id, function (e, r) {
            afterSendTx(e, r);
        });
    },
    borrowNFT: function (id) {
        console.log("borrowNFT " + id);
        showBorrowAlert(id);
    },
    borrowSure: function () {
        console.log("borrowSure");
        var id = getSellAlertId();
        console.log("loan sure id=" + id);

        hideSellAlert();

        id = parseInt(id);

        //loanInput
        var time = $('.loanInput').val();

        var regex = /^\d+$/;
        if (regex.test(time)) {
            if (time < 366 && time > 0) {

            } else {
                toastAlert(getString('errorloanday'));
                return;
            }
        } else {
            toastAlert(getString('errorloanday'));
            return;
        }
        // object.grade = grade;
        // object.price = 0;
        // object.days = 0;
        // object.startTime = 0;
        // object.owner = null;
        // object.borrowEndTime=0;
        var day = parseInt(time);

        var nft = Loan.listTokens[id];
        var price = nft.price;
        var days = nft.days;
        var starttime = nft.startTime;

        var lasttime = nft.days.mul(86400).plus(nft.startTime);
        var timenow = Math.floor((new Date()).getTime() / 1000);
        var timedelay = lasttime.sub(timenow).sub(30 * 60);
        var loantime = new BN((day - 1) * 86400);
        if (timedelay.lt(loantime)) {
            toastAlert(getString('cannotloanthislong'));
            return;
        }
        if (price.mul(day).gt(defaultBalance)) {
            toastAlert(getString('hotnotenough'));
            return;
        }
        contractsInstance.Loan.borrow(id, day, function (e, result) {
            afterSendTx(e, result);
        });
    },
    approve: function () {
        contractsInstance.HotPot.approve(contractsInstance.Loan.address, web3.toHex(Math.pow(10, 30)), function (e, r) {
            afterSendTx(e, r);
        });
    },
    loanNFT: function (id) {
        var nft = UserNFT.nftInfos[id];
        if (!NFT.isAvailable(nft.usetime)) {
            toastAlert(getString('nftnotavailable'));
            return;
        }
        if (nft.loan) {
            toastAlert(getString('loaning'));
            return;
        }
        showLoanAlert(id);
    },
    loanSure: function () {
        var id = getSellAlertId();
        console.log("loan sure id=" + id);

        hideSellAlert();
        var input = $('.stakeInput').val();
        var price = parseFloat(input);
        if (price <= 0) {
            toastAlert(getString('priceerror'));
            return;
        }
        price = web3.toHex(price * Math.pow(10, 18));
        id = parseInt(id);

        //loanInput
        var time = $('.loanInput').val();

        var regex = /^\d+$/;
        if (regex.test(time)) {
            if (time < 366 && time > 0) {

            } else {
                toastAlert(getString('errorloanday'));
                return;
            }
        } else {
            toastAlert(getString('errorloanday'));
            return;
        }

        var day = parseInt(time);

        contractsInstance.Loan.deposit(id, day, price, function (e, result) {
            afterSendTx(e, result);
        });
    },
    createLoanNft: function (id, grade) {
        var object = new Object;
        object.id = id;
        object.grade = grade;
        object.price = 0;
        object.days = 0;
        object.startTime = 0;
        object.owner = null;
        object.borrowEndTime = 0;
        object.borrower = null;
        return object;
    }
}


