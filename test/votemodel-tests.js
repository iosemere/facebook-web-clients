(function () {

    module("Vote Model", {
        setup: function () {
            model = new guardian.facebook.VoteModel()
        },
        teardown: function () {
            model.destroy()
        }
    });

    var model;

    test("Register Vote", function () {

        givenSomeData();

        equal(model.getTotal(), 0);

        when(model.registerVote("answer1"));

        equal(model.getAgree(), 1);
        equal(model.getDisagree(), 0);
        equal(model.getTotal(), 1);
        equal(model.getAgreePercent(), 100)

    });

    test("Voted Already", function () {

        givenSomeData();

        ok(!model.votedAlready());

        when(model.registerVote("answer1"));

        ok(model.votedAlready());

    });

    test("Vote for non existent answer", function () {

        givenSomeData();

        ok(!model.votedAlready());

        when(model.registerVote("doesnt_exist"));

        ok(!model.votedAlready());

    });

    test("Messages", function () {

        givenSomeData();

        equal(model.getSummaryText(), "Be the first of your friends to share your opinion");

        when(model.registerVote("answer2"));

        equal(model.getSummaryText(), "You said that this rumour is Unlikely");

    });

    test("Set data", function () {

        given(model.setAllData({
            "id": "question1",
            "answers": [
                {
                    "question": 7694,
                    "label": "Likely",
                    "id": "answer1",
                    "count": 100
                },
                {
                    "question": 7694,
                    "label": "Unlikely",
                    "id": "answer2",
                    "count": 300
                }
            ]
        }));

        equal(model.getTotal(), 400);
        equal(model.getAgreePercent(), 25);

    });

    test("FiftyFifty", function () {

        givenSomeData();

        equal(model.getTotal(), 0);
        equal(model.getAgreePercent(), 50);

    });

    function givenSomeData() {
        given(model.setAllData({
            "id": "question1",
            "answers": [
                {
                    "question": 7694,
                    "label": "Likely",
                    "id": "answer1",
                    "count": 0
                },
                {
                    "question": 7694,
                    "label": "Unlikely",
                    "id": "answer2",
                    "count": 0
                }
            ]
        }));
    }

})();