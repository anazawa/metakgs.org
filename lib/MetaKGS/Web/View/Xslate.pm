package MetaKGS::Web::View::Xslate;
use strict;
use warnings;
use File::Spec;
use MetaKGS;
use Text::Xslate;

our $INSTANCE;

sub instance {
    $INSTANCE ||= $_[0]->_build_xslate;
}

sub _build_xslate {
    my $class = shift;
    my $config = MetaKGS->config->{'Text::Xslate'} || {};
    my $path = File::Spec->catdir( MetaKGS->base_dir, 'tmpl' );

    my %options = (
        path => [ $path ],
        syntax => 'Kolon',
        module => [
            'Text::Xslate::Bridge::Star',
            'MetaKGS::Web::View::Xslate::Functions',
        ],
        html_builder_module => [
        ],
        function => {
        },
        %$config,
    );

    if ( MetaKGS->debug_mode ) {
        # print method escape html automatically
        $options{warn_handler} = sub {
            Text::Xslate->print( '[[', @_, ']]' );
        };
    }

    Text::Xslate->new( \%options );
}

1;
